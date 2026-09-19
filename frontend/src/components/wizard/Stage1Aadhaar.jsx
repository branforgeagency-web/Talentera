import React, { useState, useEffect, useRef } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { verhoeffValidate, formatAadhaar, formatMobile, isValidIndianMobile } from "../../utils/verhoeff";
import WizardCompanionRail from "./WizardCompanionRail.jsx";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveili and Daman and Diu",
  "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const POPULAR_CITIES = [
  "Bengaluru", "Hyderabad", "Chennai", "Coimbatore", "Mumbai", "Pune",
  "Delhi NCR", "Noida", "Gurgaon", "Kolkata", "Ahmedabad", "Jaipur",
  "Kochi", "Trivandrum", "Mysore", "Chandigarh", "Indore", "Nagpur",
  "Bhubaneswar", "Visakhapatnam", "Trichy", "Madurai", "Salem"
];

const LIFE_SCIENCE_COURSES = [
  "B.Sc. Nursing",
  "B.Sc. Biotechnology",
  "B.Sc. Microbiology",
  "B.Sc. Biochemistry",
  "B.Sc. Zoology / Botany / Biology",
  "B.Sc. Chemistry / Life Sciences",
  "B.Sc. MLT (Medical Lab Technology)",
  "B.Sc. HIM / Health Information Management",
  "B.Sc. Genetics / Bioinformatics",
  "B.Pharm / M.Pharm (Pharmacy)",
  "Pharm.D (Doctor of Pharmacy)",
  "BPT (Bachelor of Physiotherapy)",
  "BAMS / BHMS / BDS / MBBS (Medical / Allied Health)",
  "M.Sc. Life Sciences / Biotech / Microbiology",
  "Other Life Science Degree",
];

const NON_LIFE_SCIENCE_COURSES = [
  "B.Com (General / Computer Applications / Finance)",
  "B.Com (Hons.)",
  "B.Sc. Computer Science / IT / Maths / Physics",
  "B.Tech / B.E. (Engineering - Any Branch)",
  "B.Tech CSE",
  "BCA (Bachelor of Computer Applications)",
  "BBA / BBM (Business Administration)",
  "B.A. (Bachelor of Arts)",
  "MCA / M.Tech / MBA",
  "Diploma in Any Branch",
  "Other Non-Life Science Degree",
];

const MONTH_OPTIONS = [
  { val: "01", label: "01 · Jan" },
  { val: "02", label: "02 · Feb" },
  { val: "03", label: "03 · Mar" },
  { val: "04", label: "04 · Apr" },
  { val: "05", label: "05 · May" },
  { val: "06", label: "06 · Jun" },
  { val: "07", label: "07 · Jul" },
  { val: "08", label: "08 · Aug" },
  { val: "09", label: "09 · Sep" },
  { val: "10", label: "10 · Oct" },
  { val: "11", label: "11 · Nov" },
  { val: "12", label: "12 · Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEAR_OPTIONS = Array.from({ length: 45 }, (_, i) => String(CURRENT_YEAR + 6 - i));

function resolveStage1Data(existingData, candidate) {
  const s1 = existingData || candidate?.stage1 || {};
  const lData = s1?.aadhaarLockedData || candidate?.stage1?.aadhaarLockedData || {};

  const rawFullName =
    lData.fullName ||
    s1.fullName ||
    candidate?.stage1?.fullName ||
    candidate?.fullName ||
    "";

  const isDummyName =
    !rawFullName ||
    rawFullName.trim().toLowerCase() === "verified candidate" ||
    rawFullName.trim().toLowerCase() === "candidate";

  // Aadhaar is verified ONLY if explicitly verified via UIDAI / DigiLocker
  // (NEVER check candidate.isVerified which is only the account login/signup flag)
  const isAadhaarFlag = Boolean(
    s1.aadhaarVerified === true ||
    s1.aadhaarStatus === "VERIFIED" ||
    candidate?.stage1?.aadhaarVerified === true ||
    candidate?.stage1?.aadhaarStatus === "VERIFIED"
  );

  const isVerified = isAadhaarFlag && !isDummyName;

  const maskedAadhaar =
    s1.maskedAadhaar ||
    lData.maskedAadhaar ||
    candidate?.stage1?.maskedAadhaar ||
    (s1.aadhaarNumber ? formatAadhaar(s1.aadhaarNumber) : "");

  const fullName = isDummyName ? "" : rawFullName;

  const dob = lData.dob || s1.dob || candidate?.stage1?.dob || "";
  const gender = lData.gender || s1.gender || candidate?.stage1?.gender || "";
  const locality = lData.locality || s1.permanentLocality || s1.address || candidate?.stage1?.address || "";
  const district = lData.district || s1.permanentDistrict || s1.district || s1.city || candidate?.stage1?.district || candidate?.stage1?.city || "";
  const state = lData.state || s1.permanentState || s1.state || candidate?.stage1?.state || "";
  const careOf = lData.careOf || s1.careOf || candidate?.stage1?.careOf || "";
  const pincode = lData.pincode || s1.pincode || candidate?.stage1?.pincode || "";
  const photoUrl = lData.photoUrl || s1.photoUrl || candidate?.stage1?.photoUrl || "";
  const maskedMobile = lData.maskedMobile || s1.maskedMobile || candidate?.stage1?.maskedMobile || "";
  const transactionId = s1.aadhaarTransactionId || candidate?.stage1?.aadhaarTransactionId || "";

  return {
    isVerified,
    maskedAadhaar,
    fullName,
    dob,
    gender,
    locality,
    district,
    state,
    careOf,
    pincode,
    photoUrl,
    maskedMobile,
    transactionId,
  };
}

export default function Stage1Aadhaar({ stage, existingData, candidate, onSaved }) {
  const toast = useToast();
  const initAadhaar = resolveStage1Data(existingData, candidate);

  // 1. SECTION 1 · AADHAAR STATE
  const [aadhaarInput, setAadhaarInput] = useState(initAadhaar.maskedAadhaar);
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarOtpTimer, setAadhaarOtpTimer] = useState(0);
  const [aadhaarSendingOtp, setAadhaarSendingOtp] = useState(false);
  const [aadhaarVerifying, setAadhaarVerifying] = useState(false);
  const [transactionId, setTransactionId] = useState(initAadhaar.transactionId);
  const [maskedMobileInfo, setMaskedMobileInfo] = useState(initAadhaar.maskedMobile);
  const [aadhaarCareOf, setAadhaarCareOf] = useState(initAadhaar.careOf);
  const [aadhaarPincode, setAadhaarPincode] = useState(initAadhaar.pincode);
  const [aadhaarPhoto, setAadhaarPhoto] = useState(initAadhaar.photoUrl);
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(initAadhaar.isVerified);

  // Message Central eKYCNow DigiLocker State
  const [mcSession, setMcSession] = useState(() => {
    try {
      const stored = sessionStorage.getItem("talentera_mc_session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [mcLoading, setMcLoading] = useState(false);
  const [mcFetching, setMcFetching] = useState(false);

  // Locked Profile Data from Aadhaar
  const [lockedFullName, setLockedFullName] = useState(initAadhaar.fullName);
  const [lockedDob, setLockedDob] = useState(initAadhaar.dob);
  const [lockedGender, setLockedGender] = useState(initAadhaar.gender);
  const [lockedLocality, setLockedLocality] = useState(initAadhaar.locality);
  const [lockedDistrict, setLockedDistrict] = useState(initAadhaar.district);
  const [lockedState, setLockedState] = useState(initAadhaar.state || "");

  // 2. SECTION 2 · CONTACT DETAILS
  const [mobile, setMobile] = useState(
    existingData?.mobile ? formatMobile(existingData.mobile) : (candidate?.stage1?.mobile ? formatMobile(candidate.stage1.mobile) : (candidate?.mobile ? formatMobile(candidate.mobile) : ""))
  );
  const [isMobileVerified, setIsMobileVerified] = useState(
    Boolean(existingData?.mobileVerified || candidate?.stage1?.mobile || candidate?.mobile || true)
  );
  const [isWhatsAppSame, setIsWhatsAppSame] = useState(
    existingData?.isWhatsAppSame !== undefined ? existingData.isWhatsAppSame : true
  );
  const [email, setEmail] = useState(
    existingData?.email || candidate?.stage1?.email || candidate?.email || ""
  );
  const [bestTimeToContact, setBestTimeToContact] = useState(
    existingData?.bestTimeToContact || "Anytime"
  );
  const [preferredContactMethod, setPreferredContactMethod] = useState(
    existingData?.preferredContactMethod || "WhatsApp"
  );

  // 3. SECTION 3 · EXPERIENCE LEVEL
  const [experience, setExperience] = useState(
    existingData?.experience || candidate?.stage1?.experience || candidate?.experience || ""
  );
  const [currentRole, setCurrentRole] = useState(
    existingData?.currentRole || candidate?.stage1?.currentRole || candidate?.currentRole || ""
  );

  // 4. SECTION 4 · LOCATION
  const [isSameAddress, setIsSameAddress] = useState(
    existingData?.isCurrentSameAsPermanent !== undefined ? existingData.isCurrentSameAsPermanent : false
  );
  const [currentState, setCurrentState] = useState(
    existingData?.state || candidate?.stage1?.state || candidate?.state || "Tamil Nadu"
  );
  const [currentCity, setCurrentCity] = useState(
    existingData?.city || candidate?.stage1?.city || candidate?.city || "Chennai"
  );
  const [currentLocality, setCurrentLocality] = useState(existingData?.currentLocality || candidate?.stage1?.currentLocality || "");
  const [preferredCities, setPreferredCities] = useState(
    Array.isArray(existingData?.preferredCities) && existingData.preferredCities.length > 0
      ? existingData.preferredCities
      : []
  );
  const [cityInputOpen, setCityInputOpen] = useState(false);
  const [selectedCityOption, setSelectedCityOption] = useState("");
  const [openToRelocate, setOpenToRelocate] = useState(
    existingData?.openToRelocate || "Yes — anywhere in India"
  );
  const [globalOpportunities, setGlobalOpportunities] = useState(
    Array.isArray(existingData?.globalOpportunities) && existingData.globalOpportunities.length > 0
      ? existingData.globalOpportunities
      : []
  );

  // 5. SECTION 5 · BASIC EDUCATION
  const [educationStream, setEducationStream] = useState(
    existingData?.educationStream || ""
  );
  const [qualification, setQualification] = useState(
    existingData?.qualification || ""
  );
  const [degree, setDegree] = useState(
    existingData?.degree || ""
  );
  const [collegeName, setCollegeName] = useState(
    existingData?.collegeName || ""
  );
  const [educationStatus, setEducationStatus] = useState(
    existingData?.educationStatus || ""
  );
  const rawGrad = String(existingData?.graduationYear || existingData?.passingYear || "").trim();
  const [graduationMonth, setGraduationMonth] = useState(
    existingData?.graduationMonth || (rawGrad.includes("/") ? rawGrad.split("/")[0].padStart(2, "0") : "")
  );
  const [graduationYear, setGraduationYear] = useState(
    rawGrad.includes("/") ? rawGrad.split("/")[1] : rawGrad
  );
  const [gradingScale, setGradingScale] = useState(
    existingData?.gradingScale || "Percentage"
  );
  const [cgpa, setCgpa] = useState(
    existingData?.cgpa || existingData?.percentage || ""
  );
  const [hasActiveBacklogs, setHasActiveBacklogs] = useState(
    existingData?.hasActiveBacklogs || false
  );
  const [backlogCount, setBacklogCount] = useState(
    existingData?.backlogCount || "0"
  );

  // 6. SAVING & GENERAL UI STATE
  const [saving, setSaving] = useState(false);
  const [savedBadgeText, setSavedBadgeText] = useState("✓ Saved just now");

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (aadhaarOtpTimer > 0) {
      timer = setInterval(() => {
        setAadhaarOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [aadhaarOtpTimer]);

  // Sync state whenever existingData or candidate props load or update
  useEffect(() => {
    const resolved = resolveStage1Data(existingData, candidate);
    if (resolved.isVerified) {
      setIsAadhaarVerified(true);
      if (resolved.maskedAadhaar) setAadhaarInput(resolved.maskedAadhaar);
      if (resolved.fullName) setLockedFullName(resolved.fullName);
      if (resolved.dob) setLockedDob(resolved.dob);
      if (resolved.gender) setLockedGender(resolved.gender);
      if (resolved.locality) setLockedLocality(resolved.locality);
      if (resolved.district) setLockedDistrict(resolved.district);
      if (resolved.state) setLockedState(resolved.state);
      if (resolved.careOf) setAadhaarCareOf(resolved.careOf);
      if (resolved.pincode) setAadhaarPincode(resolved.pincode);
      if (resolved.photoUrl) setAadhaarPhoto(resolved.photoUrl);
      if (resolved.maskedMobile) setMaskedMobileInfo(resolved.maskedMobile);
      if (resolved.transactionId) setTransactionId(resolved.transactionId);
    } else {
      setIsAadhaarVerified(false);
      if (resolved.fullName) {
        setLockedFullName(resolved.fullName);
      }
    }
    // Also sync contact & location if current fields are empty
    const s1 = existingData || candidate?.stage1 || {};
    if (!mobile && (s1.mobile || candidate?.mobile)) {
      setMobile(formatMobile(s1.mobile || candidate?.mobile));
    }
    if (!email && (s1.email || candidate?.email)) {
      setEmail(s1.email || candidate?.email);
    }
    if (s1.state && (!currentState || currentState === "Tamil Nadu")) {
      setCurrentState(s1.state);
    }
    if (s1.city && (!currentCity || currentCity === "Chennai")) {
      setCurrentCity(s1.city);
    }
    if (s1.currentLocality && !currentLocality) {
      setCurrentLocality(s1.currentLocality);
    }
  }, [existingData, candidate]);

  // Handle stream change default degree
  const handleStreamChange = (stream) => {
    setEducationStream(stream);
    if (stream === "Life Science") {
      setDegree(LIFE_SCIENCE_COURSES[0]);
    } else {
      setDegree(NON_LIFE_SCIENCE_COURSES[1]);
    }
  };

  // Tag picker helpers
  const handleRemoveCity = (cityToRemove) => {
    setPreferredCities(preferredCities.filter((c) => c !== cityToRemove));
  };

  const handleAddCity = (cityToAdd) => {
    if (preferredCities.length >= 5) {
      toast("You can select up to 5 preferred cities.", "!");
      return;
    }
    if (!preferredCities.includes(cityToAdd)) {
      setPreferredCities([...preferredCities, cityToAdd]);
    }
    setCityInputOpen(false);
  };

  const toggleGlobalOpportunity = (item) => {
    if (item === "Not right now") {
      setGlobalOpportunities(["Not right now"]);
      return;
    }
    const filtered = globalOpportunities.filter((x) => x !== "Not right now");
    if (filtered.includes(item)) {
      setGlobalOpportunities(filtered.filter((x) => x !== item));
    } else {
      setGlobalOpportunities([...filtered, item]);
    }
  };

  // Aadhaar Send OTP via Real UIDAI / Talentera Gateway
  const handleSendAadhaarOtp = async () => {
    const raw = aadhaarInput.replace(/\s/g, "");
    if (raw.length !== 12) {
      toast("Please enter a valid 12-digit Aadhaar number.", "!");
      return;
    }
    if (!verhoeffValidate(raw)) {
      toast("Invalid Aadhaar number checksum. Please check your digits.", "!");
      return;
    }

    setAadhaarSendingOtp(true);
    try {
      const res = await api.post("/aadhaar/send-otp", {
        aadhaar: raw,
        mobile: mobile ? mobile.replace(/\D/g, "") : (candidate?.stage1?.mobile || candidate?.mobile || ""),
        email: email ? email.trim() : (candidate?.stage1?.email || candidate?.email || ""),
      });

      if (res.data && res.data.success) {
        setTransactionId(res.data.transactionId);
        setAadhaarOtpSent(true);
        setAadhaarOtpTimer(res.data.resendCooldown || 60);

        if (res.data.isMessageCentral && res.data.url) {
          setMcSession({
            url: res.data.url,
            verificationId: res.data.transactionId,
            referenceId: res.data.referenceId,
          });

          // Automatically open Message Central's secure DigiLocker gateway popup
          const w = 620;
          const h = 750;
          const left = (window.innerWidth - w) / 2;
          const top = (window.innerHeight - h) / 2;
          window.open(
            res.data.url,
            "MessageCentralDigiLocker",
            `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,status=no`
          );

          toast(
            "Message Central DigiLocker opened! Enter your Aadhaar & mobile OTP on the official UIDAI page.",
            "ℹ"
          );
          return;
        }

        if (res.data.maskedMobile) {
          setMaskedMobileInfo(res.data.maskedMobile);
        }

        if (res.data.devOtp) {
          setAadhaarOtp(res.data.devOtp);
        }

        toast(
          res.data.message || `OTP sent via UIDAI to your Aadhaar-registered mobile (${res.data.maskedMobile || "registered SIM"}).`,
          "✓"
        );
      }
    } catch (err) {
      console.error("Send Aadhaar OTP error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to send Aadhaar OTP. Please check the Aadhaar number.";
      toast(msg, "!");
    } finally {
      setAadhaarSendingOtp(false);
    }
  };

  // Aadhaar Verify OTP & Auto-Fetch Verified Profile Data
  const handleVerifyAadhaarOtp = async () => {
    // If Message Central DigiLocker is active, fetch the verified document
    if (mcSession?.referenceId || mcSession?.verificationId) {
      return handleFetchMessageCentral();
    }

    const cleanOtp = aadhaarOtp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast("Please enter the complete 6-digit OTP received on your mobile.", "!");
      return;
    }

    setAadhaarVerifying(true);
    try {
      const res = await api.post("/aadhaar/verify-otp", {
        transactionId: transactionId || "cf_adh_active",
        otp: cleanOtp,
      });

      if (res.data && res.data.verified) {
        setIsAadhaarVerified(true);
        setMcSession(null);
        const details = res.data.details || {};

        // 1. Auto-fetch and lock Full Name
        if (details.fullName) {
          setLockedFullName(details.fullName);
        }

        // 2. Auto-fetch and lock Date of Birth
        if (details.dob) {
          setLockedDob(details.dob);
        }

        // 3. Auto-fetch and lock Gender
        if (details.gender) {
          setLockedGender(details.gender);
        }

        // 4. Auto-fetch Address / Locality / District / State / Pincode
        if (details.address) {
          setLockedLocality(details.address);
        }
        if (details.district) {
          setLockedDistrict(details.district);
        }
        if (details.state) {
          setLockedState(details.state);
        }
        if (details.pincode) {
          setAadhaarPincode(details.pincode);
        }
        if (details.careOf) {
          setAadhaarCareOf(details.careOf);
        }
        if (details.photoUrl) {
          setAadhaarPhoto(details.photoUrl);
        }
        if (details.maskedMobile) {
          setMaskedMobileInfo(details.maskedMobile);
        }

        // 5. Auto-populate Current City & State if currently blank
        if (!currentCity && (details.city || details.district)) {
          setCurrentCity(details.city || details.district);
        }
        if (!currentState && details.state) {
          setCurrentState(details.state);
        }
        if (!currentLocality && details.address) {
          setCurrentLocality(details.address);
        }

        toast("✓ Aadhaar verified! Name, Address, DOB, and Gender auto-fetched from UIDAI.", "✓");
      }
    } catch (err) {
      console.error("Verify Aadhaar OTP error:", err);
      const msg = err.response?.data?.message || err.message || "Invalid or expired OTP. Please try again.";
      toast(msg, "!");
    } finally {
      setAadhaarVerifying(false);
    }
  };

  // Message Central Popup and Auto-Polling Refs
  const mcPopupRef = useRef(null);
  const mcPollIntervalRef = useRef(null);

  const stopMcPolling = () => {
    if (mcPollIntervalRef.current) {
      clearInterval(mcPollIntervalRef.current);
      mcPollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMcPolling();
    };
  }, []);

  const applyMcDetails = (data) => {
    setIsAadhaarVerified(true);
    const details = data?.details || {};

    if (details.fullName) setLockedFullName(details.fullName);
    if (details.dob) setLockedDob(details.dob);
    if (details.gender) setLockedGender(details.gender);
    if (details.address) setLockedLocality(details.address);
    if (details.district) setLockedDistrict(details.district);
    if (details.state) setLockedState(details.state);
    if (details.pincode) setAadhaarPincode(details.pincode);
    if (details.careOf) setAadhaarCareOf(details.careOf);
    if (details.photoUrl) setAadhaarPhoto(details.photoUrl);
    if (details.maskedAadhaar) setAadhaarInput(details.maskedAadhaar);

    if (!currentCity && (details.city || details.district)) setCurrentCity(details.city || details.district);
    if (!currentState && details.state) setCurrentState(details.state);
    if (!currentLocality && details.address) setCurrentLocality(details.address);

    setMcSession(null);
    try {
      sessionStorage.removeItem("talentera_mc_session");
    } catch (e) {}

    if (typeof onSaved === "function" && data?.candidate) {
      onSaved(data.candidate, { advance: false });
    }

    toast("✓ Aadhaar verified via DigiLocker! Identity details locked.", "✓");
  };

  const startMcPolling = (vId, refId) => {
    stopMcPolling();
    let attempts = 0;
    mcPollIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        stopMcPolling();
        return;
      }
      try {
        const res = await api.post("/aadhaar/messagecentral/fetch-document", {
          referenceId: refId || "",
          verificationId: vId || "",
        });
        if (res.data && res.data.verified) {
          stopMcPolling();
          try {
            if (mcPopupRef.current && !mcPopupRef.current.closed) {
              mcPopupRef.current.close();
            }
          } catch (e) {}
          applyMcDetails(res.data);
        }
      } catch (pollErr) {
        // Silently continue polling while UIDAI validation is in progress
      }
    }, 2500);
  };

  // Fetch verified Aadhaar details from Message Central
  const handleFetchMessageCentral = async (overrideVId, overrideRefId) => {
    let vId = overrideVId;
    let refId = overrideRefId;

    if (!vId && mcSession?.verificationId) vId = mcSession.verificationId;
    if (!refId && mcSession?.referenceId) refId = mcSession.referenceId;

    if (!vId || !refId) {
      try {
        const stored = sessionStorage.getItem("talentera_mc_session");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!vId && parsed.verificationId) vId = parsed.verificationId;
          if (!refId && parsed.referenceId) refId = parsed.referenceId;
        }
      } catch (e) {
        // ignore storage error
      }
    }

    if (!vId && candidate?.stage1?.pendingMcSession?.verificationId) {
      vId = candidate.stage1.pendingMcSession.verificationId;
    }
    if (!refId && candidate?.stage1?.pendingMcSession?.referenceId) {
      refId = candidate.stage1.pendingMcSession.referenceId;
    }

    if (!vId && !refId) {
      toast("No active Message Central session found. Please click 'Verify with Aadhaar DigiLocker' first.", "!");
      return;
    }

    setMcFetching(true);
    try {
      const res = await api.post("/aadhaar/messagecentral/fetch-document", {
        referenceId: refId || "",
        verificationId: vId || "",
      });

      if (res.data && res.data.verified) {
        stopMcPolling();
        try {
          if (mcPopupRef.current && !mcPopupRef.current.closed) {
            mcPopupRef.current.close();
          }
        } catch (e) {}
        applyMcDetails(res.data);
      }
    } catch (err) {
      console.error("Message Central fetch error:", err);
      const msg = err.response?.data?.message || "Verification still pending. Finish the DigiLocker verification in the popup, then click Fetch Details.";
      toast(msg, "!");
    } finally {
      setMcFetching(false);
    }
  };

  // Start Message Central DigiLocker Aadhaar Verification
  const handleStartMessageCentral = async () => {
    setMcLoading(true);
    try {
      const res = await api.post("/aadhaar/messagecentral/start", {
        redirectionUrl: `${window.location.origin}/wizard?stage=1&mc_done=1`,
        userFlow: "signup",
      });

      if (res.data && res.data.success && res.data.url) {
        const sessionObj = {
          url: res.data.url,
          verificationId: res.data.verificationId,
          referenceId: res.data.referenceId,
        };
        setMcSession(sessionObj);
        try {
          sessionStorage.setItem("talentera_mc_session", JSON.stringify(sessionObj));
        } catch (e) {}

        // Open secure DigiLocker gateway in centered popup window
        const w = 620;
        const h = 750;
        const left = (window.innerWidth - w) / 2;
        const top = (window.innerHeight - h) / 2;
        const popup = window.open(
          res.data.url,
          "MessageCentralDigiLocker",
          `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,status=no`
        );
        mcPopupRef.current = popup;

        // Auto-poll in background to automatically detect completion and auto-close popup
        startMcPolling(res.data.verificationId, res.data.referenceId);

        toast("DigiLocker window opened! Enter your Aadhaar & mobile OTP on the official UIDAI page.", "ℹ");
      }
    } catch (err) {
      console.error("Message Central start error:", err);
      const msg = err.response?.data?.message || "Failed to start Message Central verification session.";
      toast(msg, "!");
    } finally {
      setMcLoading(false);
    }
  };

  // Auto-detect Message Central redirect params & popup messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vId = params.get("verification_id") || params.get("verificationId") || params.get("request_id");
    const refId = params.get("reference_id") || params.get("referenceId");
    const isMcDone = params.get("mc_done") || params.get("mc") || Boolean(vId);

    // If this instance is running in the popup window after DigiLocker redirected
    if (window.opener && !window.opener.closed && (vId || isMcDone)) {
      try {
        window.opener.postMessage(
          {
            type: "TALENTERA_MC_DIGILOCKER_DONE",
            verificationId: vId,
            referenceId: refId,
          },
          "*"
        );
        setTimeout(() => {
          try {
            window.close();
          } catch (e) {}
        }, 800);
        return;
      } catch (e) {
        console.warn("Could not postMessage to opener:", e);
      }
    }

    // If main window returned from redirect directly
    if (vId || (isMcDone && (mcSession || sessionStorage.getItem("talentera_mc_session")))) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}

      handleFetchMessageCentral(vId, refId);
    }

    // Listen for completion signal from popup window
    const handlePopupMessage = (event) => {
      if (event.data && event.data.type === "TALENTERA_MC_DIGILOCKER_DONE") {
        const popupVId = event.data.verificationId;
        const popupRefId = event.data.referenceId;
        handleFetchMessageCentral(popupVId, popupRefId);
      }
    };

    window.addEventListener("message", handlePopupMessage);
    return () => window.removeEventListener("message", handlePopupMessage);
  }, []);

  // Calculate Progress Dots
  const getSectionProgress = () => {
    let completed = 0;
    if (isAadhaarVerified) completed++;
    if (mobile.trim() && email.trim()) completed++;
    if (experience) completed++;
    if (preferredCities.length > 0) completed++;
    if (degree && collegeName.trim()) completed++;
    return Math.min(completed + 1, 5);
  };

  // Save Function (Draft or Advance)
  const handleSaveStage = async (advance = false) => {
    const cleanMobile = mobile.replace(/\D/g, "");
    const cleanAadhaar = aadhaarInput.replace(/\s/g, "");
    const resolvedState = currentState || lockedState || "Tamil Nadu";
    const resolvedCity = currentCity || lockedDistrict || "Chennai";

    if (advance) {
      const missingFields = [];

      // Aadhaar verification is strictly mandatory
      if (!isAadhaarVerified) {
        missingFields.push("Aadhaar Verification (DigiLocker)");
      }
      // Full name is required
      if (!lockedFullName || lockedFullName.trim().length < 2) {
        missingFields.push("Full Legal Name");
      }
      // Mobile validation
      if (!cleanMobile || !isValidIndianMobile(cleanMobile)) {
        missingFields.push("Valid 10-Digit Mobile Number");
      }
      // Email validation
      if (!email || !email.includes("@")) {
        missingFields.push("Valid Email Address");
      }
      // Basic education validation
      if (!educationStream) {
        missingFields.push("Academic Stream");
      }
      if (!degree || degree.trim().length === 0) {
        missingFields.push("Course Name");
      }
      if (!collegeName || collegeName.trim().length < 2) {
        missingFields.push("University / College Name");
      }
      if (!educationStatus) {
        missingFields.push("Education Status");
      }
      if (!graduationMonth || !graduationYear) {
        missingFields.push("Passing Month & Year");
      }
      if (!cgpa || cgpa.trim().length === 0) {
        missingFields.push("CGPA / Percentage");
      }

      if (missingFields.length > 0) {
        const errorMsg = `Please fill all mandatory fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : ""}.`;
        toast(errorMsg, "error", { title: "Mandatory Fields Required" });

        // Smooth scroll to the first missing section
        if (!isAadhaarVerified) {
          document.getElementById("section-1")?.scrollIntoView({ behavior: "smooth" });
        } else if (!cleanMobile || !email) {
          document.getElementById("section-2")?.scrollIntoView({ behavior: "smooth" });
        } else {
          document.getElementById("section-5")?.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }
    }

    setSaving(true);
    setSavedBadgeText("Saving…");

    const rawGradYear = String(graduationYear || "").trim();
    const cleanGradYear = rawGradYear.includes("/") ? rawGradYear.split("/").pop() : rawGradYear;

    const payload = {
      // Aadhaar
      aadhaarNumber: cleanAadhaar,
      maskedAadhaar: cleanAadhaar && cleanAadhaar.length >= 4 ? `XXXX XXXX ${cleanAadhaar.slice(-4)}` : (aadhaarInput || existingData?.maskedAadhaar || ""),
      fullName: lockedFullName.trim(),
      aadhaarVerified: isAadhaarVerified,
      aadhaarVerifiedAt: existingData?.aadhaarVerifiedAt || (isAadhaarVerified ? new Date().toISOString() : null),
      aadhaarTransactionId: transactionId || existingData?.aadhaarTransactionId || null,
      maskedMobile: maskedMobileInfo || existingData?.maskedMobile || null,
      careOf: aadhaarCareOf || existingData?.careOf || null,
      pincode: aadhaarPincode || existingData?.pincode || null,
      photoUrl: aadhaarPhoto || existingData?.photoUrl || null,
      aadhaarLockedData: {
        fullName: lockedFullName,
        dob: lockedDob || existingData?.dob || "15/08/1998",
        gender: lockedGender || existingData?.gender || "Male",
        locality: lockedLocality || existingData?.address || "Chennai",
        state: lockedState || resolvedState,
        district: lockedDistrict || resolvedCity,
        careOf: aadhaarCareOf || existingData?.careOf || "",
        pincode: aadhaarPincode || existingData?.pincode || "",
        maskedMobile: maskedMobileInfo || existingData?.maskedMobile || "",
        photoUrl: aadhaarPhoto || existingData?.photoUrl || null,
        maskedAadhaar: cleanAadhaar && cleanAadhaar.length >= 4 ? `XXXX XXXX ${cleanAadhaar.slice(-4)}` : (aadhaarInput || existingData?.maskedAadhaar || ""),
      },
      dob: lockedDob || existingData?.dob || "15/08/1998",
      gender: lockedGender || existingData?.gender || "Male",
      locality: lockedLocality || existingData?.address || "Chennai",

      // Contact
      mobile: cleanMobile,
      mobileVerified: isMobileVerified,
      isWhatsAppSame,
      email: email.trim(),
      bestTimeToContact,
      preferredContactMethod,

      // Experience
      experience,
      currentRole: experience === "Experienced" ? currentRole.trim() : "Fresher",

      // Location
      permanentState: lockedState || resolvedState,
      permanentDistrict: lockedDistrict || resolvedCity,
      permanentLocality: lockedLocality || currentLocality || "Chennai",
      isCurrentSameAsPermanent: isSameAddress,
      state: resolvedState,
      city: resolvedCity,
      currentLocality,
      preferredCities: preferredCities.length > 0 ? preferredCities : [resolvedCity],
      openToRelocate,
      globalOpportunities,

      // Education
      educationStream,
      qualification,
      degree: degree.trim(),
      collegeName: collegeName.trim(),
      educationStatus,
      graduationMonth,
      graduationYear: cleanGradYear,
      gradingScale,
      cgpa: cgpa.trim(),
      percentage: cgpa.trim(),
      hasActiveBacklogs,
      backlogCount: hasActiveBacklogs ? backlogCount : "0",

      isDraft: !advance,
    };

    try {
      const res = await api.put("/candidate/stage/1", payload);
      setSavedBadgeText("✓ Saved just now");
      toast(advance ? "Stage 01 completed! Moving to Stage 02 →" : "✓ Progress saved successfully.", "✓");

      if (onSaved) {
        onSaved(res.data, { advance, nextStage: advance ? 2 : 1 });
      }
    } catch (err) {
      console.error("Save Stage 1 error:", err);
      const msg = err.response?.data?.message || "Failed to save Stage 1 details.";
      toast(msg, "!");
      setSavedBadgeText("Error saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="talentera-stage01-root">
      <style>{`
        .talentera-stage01-root {
          --navy: #0F1B3D;
          --navy-deep: #08122A;
          --navy-lite: #1A2A55;
          --navy-glow: #2A3B7A;
          --gold: #F5B41A;
          --gold-deep: #C99413;
          --gold-pale: #FFF6E0;
          --gold-soft: #FFEBB0;
          --white: #FFFFFF;
          --bg: #F5F7FB;
          --card: #FFFFFF;
          --border: #E5E7EB;
          --gray-txt: #3A425A;
          --gray-mute: #8A91A3;
          --gray-soft: #F2F3F5;
          --green: #1F7A3C;
          --green-soft: #E8F5E9;
          --red: #C0392B;
          --red-soft: #FDECEA;
          --blue: #1A4FB8;
          --blue-soft: #EEF2FF;
          font-family: 'Inter', 'Segoe UI', Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--gray-txt);
          font-size: 14px;
          line-height: 1.5;
        }

        .stage01-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 1100px) {
          .stage01-layout {
            grid-template-columns: 1fr;
          }
        }

        /* ─── MAIN CONTENT ─── */
        .stage01-main {
          min-width: 0;
        }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--gray-mute);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .breadcrumb .sep { color: var(--border); }

        /* HERO */
        .hero {
          background: linear-gradient(135deg, var(--navy) 0%, #1E3A8A 60%, #2A54B5 100%);
          color: var(--white);
          border-radius: 18px;
          padding: 30px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(15,27,61,.15);
        }
        .hero::before {
          content: '';
          position: absolute;
          right: -80px;
          top: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(245,180,26,.16), transparent 60%);
        }
        .hero-icon {
          width: 54px;
          height: 54px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 24px;
          margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(245,180,26,.32);
        }
        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .hero-chip {
          background: rgba(255,255,255,.14);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          backdrop-filter: blur(6px);
        }
        .hero-chip.gold { background: var(--gold); color: var(--navy); }
        .hero-title,
        h1.hero-title {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          line-height: 1;
          color: #ffffff !important;
        }
        .hero-subtitle {
          color: var(--gold-pale);
          font-style: italic;
          font-size: 17px;
          margin-top: 6px;
          font-weight: 500;
        }
        .hero-desc {
          color: rgba(255,255,255,.85);
          font-size: 14px;
          margin-top: 16px;
          max-width: 640px;
          line-height: 1.6;
        }
        .hero-tiles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 22px;
        }
        .hero-tile {
          background: rgba(255,255,255,.12);
          padding: 16px 14px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(8px);
        }
        .hero-tile .big {
          font-size: 20px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -.3px;
        }
        .hero-tile .small {
          font-size: 11px;
          color: rgba(255,255,255,.7);
          margin-top: 3px;
          letter-spacing: .3px;
        }

        /* CARDS */
        .stage01-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 2px 10px rgba(15,27,61,.05);
          margin-bottom: 18px;
          border: 1px solid var(--border);
        }
        .stage01-card-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--navy);
          margin: 0;
        }
        .stage01-card-eyebrow {
          font-size: 10.5px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 8px;
        }

        /* HOW-IT-WORKS RULES */
        .rules-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 18px;
        }
        @media (max-width: 680px) {
          .rules-grid { grid-template-columns: 1fr; }
          .hero-tiles { grid-template-columns: 1fr 1fr; }
        }
        .rule-tile {
          background: var(--gold-pale);
          padding: 16px 18px;
          border-radius: 12px;
          border-left: 4px solid var(--gold);
        }
        .rule-head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .rule-ico {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 700;
        }
        .rule-title {
          font-size: 13.5px;
          font-weight: 800;
          color: var(--navy);
        }
        .rule-body {
          font-size: 12.5px;
          color: var(--gray-txt);
          line-height: 1.55;
        }
        .consent-pill {
          background: var(--navy);
          color: var(--gold-pale);
          padding: 12px 16px;
          border-radius: 12px;
          font-style: italic;
          font-size: 12.5px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .consent-pill .ico {
          color: var(--gold);
          font-size: 16px;
        }

        /* FORM */
        .form-header {
          margin-bottom: 16px;
        }
        .form-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: var(--navy);
          margin: 0;
        }
        .form-header .sub {
          color: var(--gold-deep);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 6px;
        }
        .section {
          background: #FAFAF7;
          padding: 22px 24px;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
          position: relative;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px dashed var(--border);
        }
        .section-num {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--navy);
          flex: 1;
        }
        .status-chip {
          background: var(--green-soft);
          color: var(--green);
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .5px;
        }
        .status-chip.pending {
          background: var(--gray-soft);
          color: var(--gray-mute);
        }
        .status-chip.active {
          background: var(--gold-pale);
          color: var(--gold-deep);
        }

        /* FIELDS */
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) {
          .row, .row-3 { grid-template-columns: 1fr; }
        }
        label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        label .req { color: var(--red); font-weight: 700; }
        label .lock { color: var(--gray-mute); font-size: 11px; }
        .helper {
          font-size: 11px;
          color: var(--gray-mute);
          font-style: italic;
          margin-top: 2px;
        }
        input[type="text"], input[type="email"], input[type="tel"], input[type="number"], select, textarea {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 13.5px;
          color: var(--navy);
          outline: none;
          transition: .15s;
          width: 100%;
        }
        input:focus, select:focus, textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(245,180,26,.14);
        }
        input:disabled, input[readonly] {
          background: var(--gray-soft);
          color: var(--navy);
          font-weight: 600;
          cursor: not-allowed;
        }
        input.locked {
          background: #FDF6E4;
          border-color: var(--gold-soft);
          color: var(--navy);
          font-weight: 700;
        }

        /* BUTTONS */
        .action-btn {
          background: var(--gold);
          color: var(--navy);
          padding: 11px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          letter-spacing: .3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: .15s;
        }
        .action-btn:hover { background: var(--gold-soft); }
        .action-btn.small { padding: 8px 14px; font-size: 12px; }
        .action-btn.outline {
          background: transparent;
          color: var(--gold-deep);
          border: 1.5px solid var(--gold);
        }
        .action-btn.outline:hover { background: var(--gold-pale); }

        /* CHOICE CARDS */
        .choice-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .choice {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 16px 18px;
          cursor: pointer;
          transition: .15s;
          position: relative;
        }
        .choice:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .choice.selected {
          border-color: var(--gold);
          background: var(--gold-pale);
          box-shadow: 0 4px 10px rgba(245,180,26,.15);
        }
        .choice-icon {
          width: 36px;
          height: 36px;
          background: var(--navy);
          color: var(--gold);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 18px;
          margin-bottom: 8px;
        }
        .choice.selected .choice-icon { background: var(--gold); color: var(--navy); }
        .choice-title {
          font-weight: 800;
          color: var(--navy);
          font-size: 14px;
        }
        .choice-sub {
          font-size: 11.5px;
          color: var(--gray-mute);
          margin-top: 2px;
        }
        .choice-desc {
          font-size: 11.5px;
          color: var(--gray-txt);
          margin-top: 8px;
          line-height: 1.45;
        }
        .choice-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: grid;
          place-items: center;
          font-size: 11px;
        }
        .choice.selected .choice-check {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
        }

        /* TAG PICKER */
        .tag-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 10px 12px;
          min-height: 44px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
        }
        .tag {
          background: var(--navy);
          color: var(--white);
          padding: 5px 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .tag .x {
          opacity: .6;
          cursor: pointer;
          font-weight: 700;
        }
        .tag .x:hover { opacity: 1; }
        .tag-add {
          background: var(--gold-pale);
          color: var(--gold-deep);
          padding: 5px 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px dashed var(--gold);
        }

        /* OPTION ITEMS */
        .option-list { display: flex; flex-direction: column; gap: 8px; }
        .option-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          cursor: pointer;
          transition: .15s;
          font-size: 13px;
          color: var(--navy);
          font-weight: 600;
        }
        .option-item:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .option-item.selected {
          background: var(--gold-pale);
          border-color: var(--gold);
        }
        .option-item .dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .option-item.selected .dot {
          border-color: var(--gold);
          background: var(--white);
        }
        .option-item.selected .dot::after {
          content: '';
          width: 8px;
          height: 8px;
          background: var(--gold);
          border-radius: 50%;
        }
        .option-item .box {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-radius: 4px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }
        .option-item.selected .box {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
          font-size: 12px;
          font-weight: 800;
        }

        /* AADHAAR CONFIRM CARD */
        .aadhaar-confirm {
          background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
          border-radius: 14px;
          padding: 20px 22px;
          border: 2px solid var(--green);
          margin-top: 14px;
        }
        .aadhaar-confirm .head {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .aadhaar-confirm .head .ok {
          width: 32px;
          height: 32px;
          background: var(--green);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 16px;
          font-weight: 800;
        }
        .aadhaar-confirm .head .title {
          font-weight: 800;
          color: var(--navy);
          font-size: 15px;
        }
        .aadhaar-lock-row {
          display: grid;
          grid-template-columns: 110px 1fr auto;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px dashed rgba(31,122,60,.2);
          align-items: center;
        }
        .aadhaar-lock-row:last-child { border: none; }
        .aadhaar-lock-row .key {
          font-size: 11.5px;
          color: var(--green);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .aadhaar-lock-row .val {
          font-size: 13.5px;
          color: var(--navy);
          font-weight: 700;
        }
        .aadhaar-lock-row .lock {
          color: var(--gold-deep);
          font-size: 13px;
        }
        .aadhaar-btns {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .link-btn {
          background: transparent;
          color: var(--gray-txt);
          padding: 11px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: .15s;
        }
        .link-btn:hover { background: var(--white); }

        /* PROGRESS RAIL */
        .progress-rail {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--white);
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          font-size: 11.5px;
          color: var(--gray-mute);
        }
        .rail-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--border);
        }
        .rail-dot.done { background: var(--gold); }
        .rail-dot.active {
          background: var(--gold);
          box-shadow: 0 0 0 3px var(--gold-pale);
        }
        .saved-badge {
          color: var(--green);
          font-weight: 700;
          font-size: 11.5px;
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* FORM TOOLBAR */
        .form-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--gold-pale), #FFF9E0);
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid var(--gold-soft);
        }

        /* BOTTOM ACTION BAR */
        .sticky-bar {
          background: var(--white);
          padding: 16px 24px;
          border: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 16px rgba(15,27,61,.04);
          border-radius: 12px;
          margin-top: 32px;
          margin-bottom: 32px;
        }
        .sticky-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12.5px;
          color: var(--gray-txt);
        }
        .stick-bar-inner {
          height: 8px;
          width: 180px;
          background: var(--gray-soft);
          border-radius: 4px;
          overflow: hidden;
        }
        .stick-bar-fill {
          height: 100%;
          width: 15%;
          background: linear-gradient(90deg, var(--gold), var(--gold-deep));
          border-radius: 4px;
        }
        .sticky-actions { display: flex; gap: 10px; }

        /* ─── RIGHT SIDEBAR ─── */
        .right-sidebar {
          background: var(--gray-soft);
          padding: 20px 18px 40px;
          border-radius: 16px;
          border: 1px solid var(--border);
        }
        .passport-card {
          background: linear-gradient(135deg, var(--navy), #1E3A8A);
          color: var(--white);
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .passport-card::before {
          content: '';
          position: absolute;
          right: -30px;
          bottom: -30px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(245,180,26,.18), transparent 60%);
        }
        .passport-eyebrow {
          color: var(--gold);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .passport-title {
          font-size: 17px;
          font-weight: 800;
          margin-top: 4px;
        }
        .passport-status {
          background: rgba(245,180,26,.14);
          color: var(--gold);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          margin-top: 12px;
          display: inline-block;
        }
        .passport-desc {
          font-size: 11.5px;
          color: rgba(255,255,255,.75);
          margin-top: 10px;
          line-height: 1.5;
        }
        .side-card {
          background: var(--white);
          padding: 16px 18px;
          border-radius: 12px;
          margin-bottom: 14px;
          border: 1px solid var(--border);
        }
        .side-card .title {
          font-size: 11px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .side-card .title a {
          float: right;
          color: var(--gray-mute);
          font-size: 10.5px;
        }
        .company-row {
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
          align-items: center;
        }
        .company-row:last-child { border: none; padding-bottom: 0; }
        .company-row:first-child { padding-top: 0; }
        .company-logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          color: var(--white);
        }
        .clr-1 { background: linear-gradient(135deg, #F5B41A, #C99413); }
        .clr-2 { background: linear-gradient(135deg, #1A4FB8, #0F1B3D); }
        .clr-3 { background: linear-gradient(135deg, #2E8B57, #1F7A3C); }
        .clr-4 { background: linear-gradient(135deg, #8E44AD, #6D2C82); }
        .clr-5 { background: linear-gradient(135deg, #E67E22, #C0392B); }
        .company-name {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .hot-pill {
          background: var(--red);
          color: var(--white);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 8.5px;
          letter-spacing: .5px;
          font-weight: 800;
        }
        .company-meta {
          font-size: 10.5px;
          color: var(--gray-mute);
          margin-top: 1px;
        }
        .company-tags {
          display: flex;
          gap: 4px;
          margin-top: 5px;
          flex-wrap: wrap;
        }
        .comp-tag {
          background: var(--gold-pale);
          color: var(--gold-deep);
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 5px;
          font-weight: 700;
        }
        .comp-tag.blue { background: var(--blue-soft); color: var(--blue); }
        .comp-tag.green { background: var(--green-soft); color: var(--green); }
        .verified-line {
          font-size: 10px;
          color: var(--green);
          margin-top: 4px;
          font-weight: 700;
        }
        .hot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .hot-stat {
          background: var(--gold-pale);
          padding: 12px 12px;
          border-radius: 10px;
          text-align: center;
        }
        .hot-stat .big {
          font-size: 18px;
          font-weight: 800;
          color: var(--navy);
        }
        .hot-stat .small {
          font-size: 10px;
          color: var(--gray-txt);
          margin-top: 2px;
        }
      `}</style>

      <div className="stage01-layout">
        <div className="stage01-main">
          {/* BREADCRUMB */}
          <div className="breadcrumb">
            <span>Home</span>
            <span className="sep">›</span>
            <span>My Career Passport</span>
            <span className="sep">›</span>
            <span style={{ color: "var(--navy)", fontWeight: 800 }}>Stage 01 · Identity</span>
          </div>

          {/* HERO */}
          <div className="hero">
            <div className="hero-icon">🛡</div>
            <div className="hero-badges">
              <span className="hero-chip">STAGE 01 OF 08 · ACTIVE</span>
              <span className="hero-chip gold">+15 POINTS</span>
              <span className="hero-chip">~10 MIN</span>
            </div>
            <h1 className="hero-title" style={{ color: "#ffffff" }}>Identity</h1>
            <div className="hero-subtitle">Verified once. Trusted forever.</div>
            <div className="hero-desc">
              Aadhaar-lock your name, date of birth and address. Add your contact
              and preferred work locations. Every stage that follows builds on
              top of this — no verified identity, no verified career.
            </div>
            <div className="hero-tiles">
              <div className="hero-tile">
                <div className="big">UIDAI</div>
                <div className="small">Aadhaar gateway</div>
              </div>
              <div className="hero-tile">
                <div className="big">30 sec</div>
                <div className="small">avg OTP delivery</div>
              </div>
              <div className="hero-tile">
                <div className="big">SOC 2 + DPDP</div>
                <div className="small">your data, encrypted</div>
              </div>
              <div className="hero-tile">
                <div className="big">~10 min</div>
                <div className="small">your time</div>
              </div>
            </div>
          </div>

          {/* HOW STAGE 01 WORKS */}
          <div className="stage01-card">
            <div className="stage01-card-title">How Stage 01 Works</div>
            <div className="stage01-card-eyebrow">WHY IT MATTERS · WHAT WE LOCK · WHAT'S PRIVATE</div>

            <div className="rules-grid">
              <div className="rule-tile">
                <div className="rule-head">
                  <div className="rule-ico">?</div>
                  <div className="rule-title">Why we start with identity</div>
                </div>
                <div className="rule-body">
                  India's RCM industry runs on fake profiles, duplicate consultancy
                  submissions, and identity mix-ups. Aadhaar OTP via UIDAI closes
                  that gap in one tap. Without Stage 01 verified, every score and
                  badge that follows is meaningless to companies. This is the gate.
                </div>
              </div>
              <div className="rule-tile">
                <div className="rule-head">
                  <div className="rule-ico">🔒</div>
                  <div className="rule-title">What we verify and lock</div>
                </div>
                <div className="rule-body">
                  We Aadhaar-verify your name, DOB, gender, and permanent locality —
                  locked to your profile forever. Your mobile is OTP-verified and
                  your email is link-verified. These four locks are what make your
                  Talentera Career Passport untamperable.
                </div>
              </div>
              <div className="rule-tile">
                <div className="rule-head">
                  <div className="rule-ico">📍</div>
                  <div className="rule-title">What YOU tell us</div>
                </div>
                <div className="rule-body">
                  Beyond Aadhaar-locked identity, you tell us your current address,
                  preferred work cities, and openness to relocation or global
                  opportunities. These are preferences — you can update them anytime
                  as your life changes.
                </div>
              </div>
              <div className="rule-tile">
                <div className="rule-head">
                  <div className="rule-ico">👁</div>
                  <div className="rule-title">What stays private</div>
                </div>
                <div className="rule-body">
                  Companies see your name, city, preferred work cities, and an
                  "Aadhaar Verified" badge. Companies do NOT see your Aadhaar number,
                  PAN, mobile, email, or full permanent address until they actively
                  shortlist you and you accept.
                </div>
              </div>
            </div>

            <div className="consent-pill">
              <span className="ico">🔐</span>
              <span><i>By continuing, you consent to Aadhaar OTP verification via UIDAI. DPDP Act compliant.</i></span>
            </div>
          </div>

          {/* FORM TOOLBAR */}
          <div className="form-toolbar">
            <div className="progress-rail">
              <span>Progress:</span>
              {[1, 2, 3, 4, 5].map((idx) => {
                const currentSec = getSectionProgress();
                return (
                  <span
                    key={idx}
                    className={`rail-dot ${idx < currentSec ? "done" : idx === currentSec ? "active" : ""}`}
                  ></span>
                );
              })}
              <span>Section {getSectionProgress()} of 5</span>
            </div>
            <div className="saved-badge">{savedBadgeText}</div>
          </div>

          {/* FORM HEADER */}
          <div className="form-header">
            <h2>Your Stage 01 information</h2>
            <div className="sub">FILL IN · WE VERIFY · YOU EARN +15 POINTS</div>
          </div>

          {/* SECTION 1 · AADHAAR */}
          <div className="section" id="section-1">
            <div className="section-header">
              <div className="section-num">1</div>
              <div className="section-title">Aadhaar Identity Verification</div>
              <div className={`status-chip ${isAadhaarVerified ? "" : "active"}`}>
                {isAadhaarVerified ? "✓ VERIFIED · +5" : "MANDATORY · +5"}
              </div>
            </div>

            {!isAadhaarVerified ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
                      Instant Government UIDAI Verification via DigiLocker
                    </div>
                    <div style={{ fontSize: 12, color: "var(--gray-mute)", marginTop: 2 }}>
                      Paperless identity verification with UIDAI — auto-fetches name, DOB, address, and photo.
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, background: "#FEF3C7", color: "#92400E", padding: "3px 9px", borderRadius: 6, fontWeight: 800, whiteSpace: "nowrap" }}>
                    UIDAI CERTIFIED
                  </span>
                </div>

                {!mcSession ? (
                  <div>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={handleStartMessageCentral}
                      disabled={mcLoading}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        background: "linear-gradient(135deg, #0F1B3D, #1A2A55)",
                        color: "#FFF",
                        border: "none",
                        padding: "13px 20px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(15, 27, 61, 0.15)",
                      }}
                    >
                      {mcLoading ? (
                        <>Opening Message Central DigiLocker…</>
                      ) : (
                        <>
                          <span style={{ fontSize: 18 }}>🏛️</span>
                          <span>Verify with Aadhaar DigiLocker (Message Central) →</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "#166534", fontSize: 13, fontWeight: 700 }}>
                      <span>🔄</span>
                      <span>DigiLocker popup active. Complete your OTP verification, then click Fetch Details below.</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={handleFetchMessageCentral}
                        disabled={mcFetching}
                        style={{ flex: 1 }}
                      >
                        {mcFetching ? "Retrieving Details from UIDAI…" : "✓ I've Verified — Fetch My Details"}
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => window.open(mcSession.url, "MessageCentralDigiLocker", "width=620,height=750")}
                      >
                        Re-open Popup
                      </button>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          setMcSession(null);
                          try { sessionStorage.removeItem("talentera_mc_session"); } catch (e) {}
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* FULL LEGAL NAME — always shown, auto-filled by Aadhaar, editable if not verified */}
            <div style={{ marginTop: 18 }}>
              <div className="row">
                <div className="field">
                  <label>
                    Full Legal Name <span className="req">*</span>
                    {isAadhaarVerified && (
                      <span style={{ marginLeft: 8, fontSize: 10.5, color: "#16a34a", fontWeight: 700 }}>
                        🔒 Auto-filled from Aadhaar
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramkumar S"
                    value={lockedFullName}
                    disabled={isAadhaarVerified}
                    onChange={(e) => setLockedFullName(e.target.value)}
                    style={{
                      background: isAadhaarVerified ? "#f0fdf4" : undefined,
                      borderColor: isAadhaarVerified ? "#86efac" : undefined,
                    }}
                  />
                  <span style={{ color: "var(--gray-mute, #64748B)", fontSize: 11.5, marginTop: 4, display: "block" }}>
                    {isAadhaarVerified
                      ? "Official name retrieved from Government UIDAI database."
                      : "Enter your full legal name as it appears on official documents, or verify with DigiLocker below."}
                  </span>
                </div>
              </div>
            </div>

            {/* AADHAAR CONFIRM CARD (post-verify) */}
            {isAadhaarVerified && (
              <div className="aadhaar-confirm">
                <div className="head">
                  <div className="ok">✓</div>
                  <div className="title">Aadhaar Verified — Identity Locked to Profile</div>
                </div>

                {aadhaarPhoto && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                    <img
                      src={aadhaarPhoto.startsWith("data:") ? aadhaarPhoto : (aadhaarPhoto.startsWith("http") ? aadhaarPhoto : `data:image/jpeg;base64,${aadhaarPhoto}`)}
                      alt="UIDAI Official Photo"
                      style={{ width: 56, height: 68, objectFit: "cover", borderRadius: 6, border: "1.5px solid #CBD5E1", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>UIDAI Official Photo Verified</div>
                      <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>Securely fetched from Government UIDAI DigiLocker</div>
                    </div>
                  </div>
                )}

                <div className="aadhaar-lock-row">
                  <div className="key">Aadhaar Number</div>
                  <div className="val">{aadhaarInput || existingData?.maskedAadhaar || candidate?.stage1?.maskedAadhaar || "UIDAI Verified"}</div>
                  <div className="lock">🔒 UIDAI Verified</div>
                </div>
                <div className="aadhaar-lock-row">
                  <div className="key">Full Name</div>
                  <div className="val">{lockedFullName || "—"}</div>
                  <div className="lock">🔒 Locked</div>
                </div>
                {aadhaarCareOf && (
                  <div className="aadhaar-lock-row">
                    <div className="key">Care Of</div>
                    <div className="val">{aadhaarCareOf}</div>
                    <div className="lock">🔒 Locked</div>
                  </div>
                )}
                <div className="aadhaar-lock-row">
                  <div className="key">Date of Birth</div>
                  <div className="val">{lockedDob || "—"}</div>
                  <div className="lock">🔒 Locked</div>
                </div>
                <div className="aadhaar-lock-row">
                  <div className="key">Gender</div>
                  <div className="val">{lockedGender || "—"}</div>
                  <div className="lock">🔒 Locked</div>
                </div>
                <div className="aadhaar-lock-row">
                  <div className="key">Address</div>
                  <div className="val">
                    {lockedLocality || [lockedDistrict, lockedState].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="lock">🔒 Locked</div>
                </div>
                {aadhaarPincode && (
                  <div className="aadhaar-lock-row">
                    <div className="key">Pincode</div>
                    <div className="val">{aadhaarPincode}</div>
                    <div className="lock">🔒 Locked</div>
                  </div>
                )}
                {maskedMobileInfo && (
                  <div className="aadhaar-lock-row">
                    <div className="key">Aadhaar Phone</div>
                    <div className="val">{maskedMobileInfo} (UIDAI Verified)</div>
                    <div className="lock">🔒 Verified</div>
                  </div>
                )}
                <div className="aadhaar-btns">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      const sec2 = document.getElementById("section-2");
                      if (sec2) sec2.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Confirm &amp; continue →
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setIsAadhaarVerified(false);
                      toast("You can now re-verify with Aadhaar DigiLocker.", "ℹ");
                    }}
                  >
                    Re-verify with DigiLocker
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => toast("Mismatch ticket raised with Talentera Support.", "ℹ")}
                  >
                    Report mismatch
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2 · CONTACT DETAILS */}
          <div className="section" id="section-2">
            <div className="section-header">
              <div className="section-num">2</div>
              <div className="section-title">Contact Details</div>
              <div className={`status-chip ${mobile.trim() && email.trim() ? "completed" : "pending"}`}>
                {mobile.trim() && email.trim() ? "✓ COMPLETED" : "PENDING"}
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>
                  Mobile Number (10 digits) <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={12}
                  value={mobile}
                  onChange={(e) => setMobile(formatMobile(e.target.value))}
                />
                <div className="helper">Used for interview invites and recruiter calls.</div>
              </div>
              <div className="field">
                <label>
                  Email ID <span className="req">*</span>
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="helper">Official communications and job offers will be sent here.</div>
              </div>
            </div>

            <div className="option-list" style={{ margin: "4px 0 14px" }}>
              <div
                className={`option-item ${isWhatsAppSame ? "selected" : ""}`}
                onClick={() => setIsWhatsAppSame(!isWhatsAppSame)}
              >
                <div className="box">{isWhatsAppSame ? "✓" : ""}</div>
                <div>Same mobile number is my WhatsApp number</div>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Best time to contact</label>
                <select
                  value={bestTimeToContact}
                  onChange={(e) => setBestTimeToContact(e.target.value)}
                >
                  <option>Anytime</option>
                  <option>Morning (9 AM – 12 PM)</option>
                  <option>Afternoon (12 – 5 PM)</option>
                  <option>Evening (5 – 9 PM)</option>
                </select>
                <div className="helper">Helps HRs and Talentera reach you at the right hours.</div>
              </div>
              <div className="field">
                <label>
                  Preferred contact method <span className="req">*</span>
                </label>
                <div className="row-3">
                  {[
                    { key: "WhatsApp", label: "📱 WhatsApp" },
                    { key: "Call", label: "📞 Call" },
                    { key: "Email", label: "✉ Email" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`option-item ${preferredContactMethod === item.key ? "selected" : ""}`}
                      onClick={() => setPreferredContactMethod(item.key)}
                    >
                      <div className="dot"></div>
                      <div>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3 · EXPERIENCE LEVEL */}
          <div className="section" id="section-3">
            <div className="section-header">
              <div className="section-num">3</div>
              <div className="section-title">Experience Level</div>
              <div className="status-chip pending">PENDING</div>
            </div>

            <div className="field">
              <label>
                Which best describes you? <span className="req">*</span>
              </label>
              <div className="helper" style={{ marginBottom: 10 }}>
                This locks the flow for Stage 02. Choose carefully.
              </div>
              <div className="choice-row">
                <div
                  className={`choice ${experience === "Fresher" ? "selected" : ""}`}
                  onClick={() => setExperience("Fresher")}
                >
                  <div className="choice-check">{experience === "Fresher" ? "✓" : ""}</div>
                  <div className="choice-icon">🎓</div>
                  <div className="choice-title">Fresher</div>
                  <div className="choice-sub">New to Industry</div>
                  <div className="choice-desc">
                    Currently studying or recently graduated. No RCM work experience yet.
                  </div>
                </div>
                <div
                  className={`choice ${experience === "Experienced" ? "selected" : ""}`}
                  onClick={() => setExperience("Experienced")}
                >
                  <div className="choice-check">{experience === "Experienced" ? "✓" : ""}</div>
                  <div className="choice-icon">💼</div>
                  <div className="choice-title">Experienced</div>
                  <div className="choice-sub">1+ yrs in Coding / RCM</div>
                  <div className="choice-desc">
                    Currently or previously working in an RCM role. Job title, company, tenure required in Stage 02.
                  </div>
                </div>
              </div>
            </div>

            {experience === "Experienced" && (
              <div className="field" style={{ marginTop: 14 }}>
                <label>
                  Current / Most Recent Role <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Medical Coder / IP-DRG Specialist"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                />
                <div className="helper">Details regarding company and tenure will be expanded in Stage 02.</div>
              </div>
            )}
          </div>

          {/* SECTION 4 · LOCATION */}
          <div className="section" id="section-4">
            <div className="section-header">
              <div className="section-num">4</div>
              <div className="section-title">Location</div>
            </div>

            {/* Block A: Permanent */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ marginBottom: 8 }}>
                🏠 Permanent Address {isAadhaarVerified ? <span className="lock">(auto-locked from Aadhaar)</span> : <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 500 }}>(auto-filled from Aadhaar or manual entry)</span>}
              </label>
              <div className="row-3">
                <div className="field">
                  <input
                    type="text"
                    className={isAadhaarVerified ? "locked" : ""}
                    value={lockedState}
                    readOnly={isAadhaarVerified}
                    placeholder="e.g. Tamil Nadu"
                    onChange={(e) => setLockedState(e.target.value)}
                  />
                  <div className="helper">State</div>
                </div>
                <div className="field">
                  <input
                    type="text"
                    className={isAadhaarVerified ? "locked" : ""}
                    value={lockedDistrict}
                    readOnly={isAadhaarVerified}
                    placeholder="e.g. Chennai"
                    onChange={(e) => setLockedDistrict(e.target.value)}
                  />
                  <div className="helper">District</div>
                </div>
                <div className="field">
                  <input
                    type="text"
                    className={isAadhaarVerified ? "locked" : ""}
                    value={lockedLocality}
                    readOnly={isAadhaarVerified}
                    placeholder="e.g. T. Nagar"
                    onChange={(e) => setLockedLocality(e.target.value)}
                  />
                  <div className="helper">Locality</div>
                </div>
              </div>
            </div>

            {/* Block B: Current */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ marginBottom: 8 }}>📍 Current Address</label>
              <div className="option-list" style={{ marginBottom: 10 }}>
                <div
                  className={`option-item ${isSameAddress ? "selected" : ""}`}
                  onClick={() => {
                    const next = !isSameAddress;
                    setIsSameAddress(next);
                    if (next) {
                      setCurrentState(lockedState || "Tamil Nadu");
                      setCurrentCity(lockedDistrict || "Chennai");
                      setCurrentLocality(lockedLocality || "Chennai");
                    }
                  }}
                >
                  <div className="box">{isSameAddress ? "✓" : ""}</div>
                  <div>Same as permanent address</div>
                </div>
              </div>
              {!isSameAddress && (
              <div className="row-3">
                <div className="field">
                  <select
                    value={currentState}
                    disabled={isSameAddress}
                    onChange={(e) => setCurrentState(e.target.value)}
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <div className="helper">State</div>
                </div>
                <div className="field">
                  <select
                    value={currentCity}
                    disabled={isSameAddress}
                    onChange={(e) => setCurrentCity(e.target.value)}
                  >
                    <option value="">Select City</option>
                    {POPULAR_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="helper">City</div>
                </div>
                <div className="field">
                  <input
                    type="text"
                    placeholder="e.g. HSR Layout"
                    value={currentLocality}
                    disabled={isSameAddress}
                    onChange={(e) => setCurrentLocality(e.target.value)}
                  />
                  <div className="helper">Locality (optional)</div>
                </div>
              </div>
              )}
            </div>

            {/* Block C: Preferences */}
            <div style={{ marginBottom: 18 }}>
              <label>
                💼 Willing to Work In <span className="req">*</span>{" "}
                <span className="helper" style={{ fontWeight: 500, fontStyle: "normal" }}>
                  (pick up to 5 cities)
                </span>
              </label>
              <div className="tag-picker">
                {preferredCities.map((city) => (
                  <span key={city} className="tag">
                    {city} <span className="x" onClick={() => handleRemoveCity(city)}>×</span>
                  </span>
                ))}
                {preferredCities.length < 5 && (
                  <span
                    className="tag-add"
                    onClick={() => setCityInputOpen(!cityInputOpen)}
                  >
                    + Add city
                  </span>
                )}
              </div>
              {cityInputOpen && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                  <select
                    value={selectedCityOption}
                    onChange={(e) => setSelectedCityOption(e.target.value)}
                    style={{ maxWidth: 220 }}
                  >
                    {POPULAR_CITIES.filter((c) => !preferredCities.includes(c)).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="action-btn small"
                    onClick={() => handleAddCity(selectedCityOption)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ padding: "6px 12px", fontSize: 12 }}
                    onClick={() => setCityInputOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="field">
              <label>
                🌍 Open to Relocate? <span className="req">*</span>
              </label>
              <div className="option-list">
                {[
                  "Yes — anywhere in India",
                  "Yes — but only Tier-1 cities",
                  "Yes — but only my preferred cities",
                  "No — only my current city",
                ].map((opt) => (
                  <div
                    key={opt}
                    className={`option-item ${openToRelocate === opt ? "selected" : ""}`}
                    onClick={() => setOpenToRelocate(opt)}
                  >
                    <div className="dot"></div>
                    <div><b>{opt}</b></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                🌐 Open to Global Opportunities? <span className="req">*</span>
              </label>
              <div className="option-list">
                {[
                  { key: "US (offshore night shift)", label: "🇺🇸 US (offshore night shift)" },
                  { key: "Philippines · UAE · Saudi", label: "🌏 Philippines · UAE · Saudi" },
                  { key: "Not right now", label: "🚫 Not right now" },
                ].map((item) => {
                  const isChecked = globalOpportunities.includes(item.key);
                  return (
                    <div
                      key={item.key}
                      className={`option-item ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleGlobalOpportunity(item.key)}
                    >
                      <div className="box">{isChecked ? "✓" : ""}</div>
                      <div>{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 5 · BASIC EDUCATION */}
          <div className="section" id="section-5">
            <div className="section-header">
              <div className="section-num">5</div>
              <div className="section-title">Basic Education</div>
              <div className="status-chip pending">PENDING · +3</div>
            </div>

            <div className="field">
              <label>
                Academic Stream <span className="req">*</span>
              </label>
              <div className="choice-row">
                <div
                  className={`choice ${educationStream === "Life Science" ? "selected" : ""}`}
                  onClick={() => handleStreamChange("Life Science")}
                >
                  <div className="choice-check">{educationStream === "Life Science" ? "✓" : ""}</div>
                  <div className="choice-icon">🧬</div>
                  <div className="choice-title">Life Science</div>
                  <div className="choice-sub">B.Sc · Pharmacy · Nursing · Allied Health</div>
                </div>
                <div
                  className={`choice ${educationStream === "Non-Life Science" ? "selected" : ""}`}
                  onClick={() => handleStreamChange("Non-Life Science")}
                >
                  <div className="choice-check">{educationStream === "Non-Life Science" ? "✓" : ""}</div>
                  <div className="choice-icon">📚</div>
                  <div className="choice-title">Non-Life Science</div>
                  <div className="choice-sub">B.Com · B.Tech · BCA · BBA · Arts</div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>
                  Highest Qualification <span className="req">*</span>
                </label>
                <select
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                >
                  <option>UG · Undergraduate</option>
                  <option>PG · Postgraduate</option>
                  <option>Diploma</option>
                  <option>12th</option>
                  <option>10th</option>
                </select>
              </div>
              <div className="field">
                <label>
                  Course Name <span className="req">*</span>
                </label>
                <select
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                >
                  {(educationStream === "Life Science" ? LIFE_SCIENCE_COURSES : NON_LIFE_SCIENCE_COURSES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>
                  University / College <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Start typing — UGC-recognized list"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                />
                <div className="helper">Auto-suggests from UGC-recognized institutions.</div>
              </div>
              <div className="field">
                <label>
                  Status <span className="req">*</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <div
                    className={`option-item ${educationStatus === "Completed" ? "selected" : ""}`}
                    onClick={() => setEducationStatus("Completed")}
                  >
                    <div className="dot"></div>
                    <div>Completed</div>
                  </div>
                  <div
                    className={`option-item ${educationStatus === "Pursuing" ? "selected" : ""}`}
                    onClick={() => setEducationStatus("Pursuing")}
                  >
                    <div className="dot"></div>
                    <div>Pursuing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row-3">
              <div className="field">
                <label>
                  Passing Month & Year <span className="req">*</span>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select
                    value={graduationMonth}
                    onChange={(e) => setGraduationMonth(e.target.value)}
                  >
                    <option value="">Month…</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.val} value={m.val}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  >
                    <option value="">Year…</option>
                    {GRAD_YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="helper">Month & year of completion.</div>
              </div>
              <div className="field">
                <label>
                  Grading Scale <span className="req">*</span>
                </label>
                <select
                  value={gradingScale}
                  onChange={(e) => setGradingScale(e.target.value)}
                >
                  <option>Percentage</option>
                  <option>CGPA (out of 10)</option>
                </select>
              </div>
              <div className="field">
                <label>
                  CGPA / Percentage <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 78%"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>
                  Any Active Backlogs? <span className="req">*</span>
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <div
                    className={`option-item ${hasActiveBacklogs ? "selected" : ""}`}
                    onClick={() => setHasActiveBacklogs(true)}
                  >
                    <div className="dot"></div>
                    <div>Yes</div>
                  </div>
                  <div
                    className={`option-item ${!hasActiveBacklogs ? "selected" : ""}`}
                    onClick={() => {
                      setHasActiveBacklogs(false);
                      setBacklogCount("0");
                    }}
                  >
                    <div className="dot"></div>
                    <div>No</div>
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Backlog Count</label>
                <input
                  type="text"
                  value={backlogCount}
                  onChange={(e) => setBacklogCount(e.target.value.replace(/\D/g, ""))}
                  placeholder="If yes, enter number"
                  disabled={!hasActiveBacklogs}
                />
                <div className="helper">Companies filter this before shortlisting.</div>
              </div>
            </div>
          </div>

          {/* STICKY BOTTOM BAR */}
          <div className="sticky-bar">
            <div className="sticky-progress">
              <div className="stick-bar-inner">
                <div className="stick-bar-fill"></div>
              </div>
              <div><b>15 / 100</b> · Stage 01 in progress</div>
            </div>
            <div className="sticky-actions">
              <button
                type="button"
                className="action-btn"
                onClick={() => handleSaveStage(true)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save & continue to Stage 02 →"}
              </button>
            </div>
          </div>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="right-sidebar" style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={1} candidate={candidate} />
        </div>
      </div>
    </div>
  );
}
