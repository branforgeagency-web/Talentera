/**
 * Stage 3 (AAPC / AHIMA Certification) — issuing bodies + certification list.
 * Ported from the prototype's CERT_LIBRARY. Flagship certs (CPC, CRC, CCS,
 * CHIM) carry full detail (time/questions/fee/description) as given in the
 * source; the rest carry reasonable, clearly-labeled placeholder detail
 * text pending real AAPC/AHIMA directory data.
 */

function cert(code, name, opts = {}) {
  return {
    code,
    name,
    target: opts.target || "RCM professionals",
    time: opts.time || "3-4 hrs",
    qs: opts.qs || 100,
    usd: opts.usd || 399,
    inr: opts.inr || "~₹33,500",
    flag: opts.flag || null,
    flagText: opts.flagText || null,
    featured: opts.featured || false,
    desc: opts.desc || `${name} (${code}) — industry-recognized credential for medical coding / billing professionals.`,
    prereq: opts.prereq || "Varies — check issuing body's current requirements.",
    bestFor: opts.bestFor || "RCM professionals specializing in this credential's domain.",
  };
}

export const CERT_LIBRARY = {
  aapc: {
    key: "aapc",
    name: "AAPC",
    fullName: "American Academy of Professional Coders",
    color: "#F59E0B",
    memberCount: "230K+",
    verifyUrl: "https://www.aapc.com/medical-coding-certification/verify-a-member.aspx",
    certs: [
      cert("CPC", "Certified Professional Coder", {
        target: "Physician-side / outpatient coders", time: "4 hrs", qs: 100, usd: 399, inr: "~₹33,500",
        flag: "popular", flagText: "Most Popular", featured: true,
        desc: "The flagship AAPC credential — validates expertise in physician office and outpatient CPT/ICD-10-CM/HCPCS coding.",
        prereq: "2 years coding experience recommended · without experience, credential awarded as CPC-A until experience requirement is met.",
        bestFor: "Entry-to-mid level physician-side and outpatient (OP) coding.",
      }),
      cert("CPC-A", "Certified Professional Coder — Apprentice", { target: "Freshers", flag: "fresher", flagText: "Fresher Track", desc: "Awarded to CPC exam passers who haven't yet met the 2-year experience requirement.", bestFor: "Freshers starting their coding career." }),
      cert("COC", "Certified Outpatient Coder", { target: "Hospital outpatient / ASC coders", desc: "Validates hospital outpatient and ambulatory surgical center coding expertise." }),
      cert("CIC", "Certified Inpatient Coder", { target: "Hospital inpatient coders", time: "5.5 hrs", desc: "Advanced credential for hospital inpatient (DRG-based) coding." }),
      cert("CPB", "Certified Professional Biller", { target: "Medical billers", desc: "Validates end-to-end medical billing process expertise — claims, payment posting, denials, appeals." }),
      cert("CRC", "Certified Risk Adjustment Coder", {
        target: "HCC / Risk Adjustment coders", time: "4 hrs", qs: 100, usd: 399, inr: "~₹33,500",
        flag: "required", flagText: "HCC Required", featured: true,
        desc: "Most-demanded specialty certification in current US-payer hiring — validates HCC/RAF risk-adjustment coding.",
        bestFor: "HCC coders — commands ₹5-10L+ offers at top RCM employers.",
      }),
      cert("CPMA", "Certified Professional Medical Auditor", { target: "Coding auditors", desc: "Validates medical record auditing and compliance expertise." }),
      cert("CDEO", "Certified Documentation Expert Outpatient", { target: "Clinical documentation specialists", desc: "Validates outpatient clinical documentation improvement expertise." }),
      cert("CPPM", "Certified Physician Practice Manager", { target: "Practice managers", desc: "Validates physician practice management and operations expertise." }),
      cert("CCC", "Certified Cardiology Coder", { target: "Cardiology coders", desc: "Specialty coding credential for cardiology procedures and diagnoses." }),
      cert("CEDC", "Certified Emergency Department Coder", { target: "ED coders", desc: "Specialty coding credential for emergency department services." }),
      cert("CEMC", "Certified Evaluation and Management Coder", { target: "E/M coders", desc: "Specialty credential for Evaluation & Management coding across settings." }),
      cert("COSC", "Certified Orthopaedic Surgery Coder", { target: "Orthopaedic coders", desc: "Specialty coding credential for orthopaedic surgery." }),
      cert("CIMC", "Certified Internal Medicine Coder", { target: "Internal medicine coders", desc: "Specialty coding credential for internal medicine practices." }),
      cert("COBGC", "Certified OB-GYN Coder", { target: "OB-GYN coders", desc: "Specialty coding credential for obstetrics and gynecology." }),
      cert("CPEDC", "Certified Pediatric Coder", { target: "Pediatric coders", desc: "Specialty coding credential for pediatric services." }),
      cert("CGIC", "Certified Gastroenterology Coder", { target: "GI coders", desc: "Specialty coding credential for gastroenterology." }),
      cert("CHONC", "Certified Hematology and Oncology Coder", { target: "Oncology coders", desc: "Specialty coding credential for hematology/oncology." }),
      cert("CGSC", "Certified General Surgery Coder", { target: "General surgery coders", desc: "Specialty coding credential for general surgery." }),
      cert("CASCC", "Certified Ambulatory Surgical Center Coder", { target: "ASC coders", desc: "Specialty coding credential for ambulatory surgical centers." }),
      cert("CANPC", "Certified Anesthesia and Pain Management Coder", { target: "Anesthesia coders", desc: "Specialty coding credential for anesthesia and pain management." }),
      cert("CDERC", "Certified Dermatology Coder", { target: "Dermatology coders", desc: "Specialty coding credential for dermatology." }),
      cert("CENTC", "Certified ENT Coder", { target: "ENT coders", desc: "Specialty coding credential for otolaryngology (ENT)." }),
    ],
  },
  ahima: {
    key: "ahima",
    name: "AHIMA",
    fullName: "American Health Information Management Association",
    color: "#0EA5E9",
    memberCount: "100K+",
    verifyUrl: "https://my.ahima.org/certification/verify",
    certs: [
      cert("CCA", "Certified Coding Associate", { target: "Entry-level coders", flag: "fresher", flagText: "Entry Level", desc: "AHIMA's entry-level coding credential, applicable across hospital and physician settings." }),
      cert("CCS", "Certified Coding Specialist", {
        target: "Hospital inpatient coders", time: "4 hrs", qs: 115, usd: 399, inr: "~₹33,500",
        flag: "popular", flagText: "Gold Standard", featured: true,
        desc: "Considered the gold standard for hospital inpatient coding expertise — deep ICD-10-CM/PCS mastery.",
        bestFor: "Experienced hospital inpatient coders.",
      }),
      cert("CCS-P", "Certified Coding Specialist — Physician-based", { target: "Physician-based coders", desc: "Physician-based counterpart to CCS — outpatient/physician office coding mastery." }),
      cert("RHIT", "Registered Health Information Technician", { target: "HIM technicians", desc: "Validates health information management technical expertise." }),
      cert("RHIA", "Registered Health Information Administrator", { target: "HIM administrators", desc: "Validates health information management administrative/leadership expertise." }),
      cert("CDIP", "Certified Documentation Integrity Practitioner", { target: "CDI specialists", desc: "Validates clinical documentation integrity program expertise." }),
      cert("CHDA", "Certified Health Data Analyst", { target: "Health data analysts", desc: "Validates health data analytics expertise." }),
      cert("CHPS", "Certified in Healthcare Privacy and Security", { target: "Privacy/security officers", desc: "Validates healthcare privacy and security compliance expertise." }),
      cert("CPHI", "Certified Professional in Health Informatics", { target: "Health informatics professionals", desc: "Validates health informatics expertise." }),
    ],
  },
  himaa: {
    key: "himaa",
    name: "HIMAA",
    fullName: "Health Information Management Association of Australia",
    color: "#10B981",
    memberCount: "5K+",
    verifyUrl: "https://www.himaa.org.au/",
    certs: [
      cert("CHIM", "Certified Health Information Manager", {
        target: "Australia · ICD-10-AM coders", flag: "popular", flagText: "Flagship",
        desc: "HIMAA's flagship credential for health information management under the ICD-10-AM classification system.",
        bestFor: "Coders targeting Australian healthcare RCM roles.",
      }),
      cert("HIMAA-CC", "Clinical Coder Certification", { target: "Australia · clinical coders", desc: "Validates clinical coding expertise under ICD-10-AM/ACHI." }),
      cert("HIMAA-AC", "Advanced Coder Certification", { target: "Australia · advanced coders", desc: "Advanced-level clinical coding credential." }),
      cert("HIMAA-IC", "Inpatient Coder Certification", { target: "Australia · inpatient coders", desc: "Inpatient-focused clinical coding credential." }),
      cert("HIMAA-MT", "Medical Terminology Certification", { target: "Australia · foundational", desc: "Foundational medical terminology credential." }),
      cert("FHIMAA", "Fellow of HIMAA", { target: "Senior HIM professionals", desc: "Senior fellowship-level recognition within HIMAA." }),
    ],
  },
  specialty: {
    key: "specialty",
    name: "Others",
    fullName: "Specialty & other issuing bodies (Home Health / AMBA / PMI / NHA / BMSC)",
    color: "#8B5CF6",
    memberCount: "—",
    verifyUrl: null,
    certs: [
      cert("BCHH-C", "Board Certified Home Health Coder", { target: "Home health coders", flag: "popular", flagText: "Home Health", desc: "Board certification for home health coding (OASIS/HHRG)." }),
      cert("HCS-D", "Home Care Coding Specialist — Diagnosis", { target: "Home care coders", desc: "Diagnosis-coding specialty credential for home care." }),
      cert("HCS-O", "Home Care Coding Specialist — OASIS", { target: "Home care coders", desc: "OASIS assessment-coding specialty credential." }),
      cert("HCS-H", "Home Care Clinical Specialist", { target: "Home care clinicians", desc: "Clinical specialty credential for home care coding." }),
      cert("CMRS", "Certified Medical Reimbursement Specialist", { target: "AR / billing specialists", desc: "AMBA's credential for medical reimbursement and billing expertise." }),
      cert("CMCS", "Certified Medical Coding Specialist", { target: "PMI · coders", desc: "PMI's general medical coding specialty credential." }),
      cert("CMC", "Certified Medical Coder", { target: "PMI · coders", desc: "PMI's foundational medical coding credential." }),
      cert("CMOM", "Certified Medical Office Manager", { target: "PMI · office managers", desc: "PMI's medical office management credential." }),
      cert("CMIS", "Certified Medical Insurance Specialist", { target: "PMI · insurance specialists", desc: "PMI's medical insurance and billing credential." }),
      cert("CBCS", "Certified Billing and Coding Specialist", { target: "NHA · billing/coding", desc: "NHA's entry-level billing and coding credential." }),
      cert("ACE-A", "Advanced Coding Expert — Apprentice", { target: "BMSC · apprentice coders", flag: "fresher", flagText: "Apprentice", desc: "BMSC's apprentice-level advanced coding credential." }),
    ],
  },
};

export const CERT_ID_PATTERNS = {
  aapc: { regex: /^\d{8}$/, description: "8 digits (numeric)", placeholder: "e.g., 01234567" },
  ahima: { regex: /^\d{6,8}$/, description: "6-8 digits (numeric)", placeholder: "e.g., 1234567" },
  himaa: { regex: /^[A-Za-z0-9]{4,12}$/, description: "4-12 alphanumeric chars", placeholder: "e.g., M12345" },
  specialty: { regex: /^[A-Za-z0-9-]{4,}$/, description: "4+ alphanumeric chars (varies by body)", placeholder: "e.g., BCHHC-1234" },
};
