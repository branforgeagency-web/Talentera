// Companies shown in the "Current / Most Recent Company" dropdown (Stage 2 - experienced candidates),
// plus the branch locations the candidate can pick once a company is chosen.
//
// HOW TO UPDATE: add or edit entries below.  { name, locations: ["City", ...] }
//   - `locations` = the cities where that company has branches / delivery centres.
//   - Leave `locations: []` when the branch list isn't known yet - the form then offers the
//     general city list (WORK_LOCATION_FALLBACK) so candidates can still pick where they work.
// NOTE: branch lists below are a starting point and should be checked against the real list.

export const WORK_COMPANIES = [
  { name: "Access Healthcare", locations: [] },
  { name: "AGS Health", locations: [] },
  { name: "Allied Digital", locations: [] },
  { name: "Altruista Health", locations: [] },
  { name: "Apollo Health & Lifestyle", locations: [] },
  { name: "Apollo Hospitals", locations: [] },
  { name: "Aspirion", locations: [] },
  { name: "Athenahealth", locations: [] },
  { name: "Cerner", locations: [] },
  { name: "CitiusTech", locations: [] },
  { name: "Clarus RCM", locations: [] },
  { name: "Cognizant", locations: ["Chennai", "Bengaluru", "Hyderabad", "Coimbatore", "Pune", "Kolkata", "Kochi", "Mumbai", "Gurugram", "Noida"] },
  { name: "Conifer Health Solutions", locations: [] },
  { name: "Dignity Health Global Education", locations: [] },
  { name: "eClinicalWorks", locations: [] },
  { name: "Episource", locations: [] },
  { name: "Equinox Healthcare", locations: [] },
  { name: "EXL Service", locations: [] },
  { name: "Firstsource", locations: [] },
  { name: "Fortis Healthcare", locations: [] },
  { name: "GeBBS Healthcare Solutions", locations: [] },
  { name: "Genpact", locations: ["Gurugram", "Noida", "Bengaluru", "Hyderabad", "Pune", "Jaipur", "Mumbai"] },
  { name: "HCL Technologies", locations: [] },
  { name: "HGS (Hinduja Global Solutions)", locations: [] },
  { name: "HealthAxis", locations: [] },
  { name: "Healthcare Triangle", locations: [] },
  { name: "Infosys BPM", locations: ["Bengaluru", "Pune", "Chennai", "Hyderabad", "Bhubaneswar"] },
  { name: "iMedX", locations: [] },
  { name: "Ikigai Medical Billing", locations: [] },
  { name: "Invensis", locations: [] },
  { name: "IQVIA", locations: [] },
  { name: "Maxim Healthcare", locations: [] },
  { name: "MCI (Medical Coding Inc.)", locations: [] },
  { name: "MedQuist", locations: [] },
  { name: "MediBuddy", locations: [] },
  { name: "Medusind", locations: [] },
  { name: "Medi Assist", locations: [] },
  { name: "Mphasis", locations: [] },
  { name: "MTBC (CareCloud)", locations: [] },
  { name: "Navigant (Guidehouse)", locations: [] },
  { name: "Nuance", locations: [] },
  { name: "nThrive", locations: [] },
  { name: "Omega Healthcare", locations: [] },
  { name: "Optum (UnitedHealth Group)", locations: ["Hyderabad", "Bengaluru", "Gurugram", "Noida", "Chennai"] },
  { name: "Parexel", locations: [] },
  { name: "R1 RCM", locations: [] },
  { name: "Runwal Healthcare", locations: [] },
  { name: "Sutherland Global", locations: [] },
  { name: "SPi Global", locations: [] },
  { name: "Sodexo Healthcare", locations: [] },
  { name: "Tata Consultancy Services (TCS)", locations: ["Chennai", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Kolkata", "Kochi", "Coimbatore", "Gurugram", "Noida"] },
  { name: "TeamHealth", locations: [] },
  { name: "Tech Mahindra", locations: ["Pune", "Hyderabad", "Bengaluru", "Chennai", "Noida", "Mumbai"] },
  { name: "Teleperformance", locations: [] },
  { name: "Wipro", locations: ["Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Noida"] },
  { name: "WNS Global Services", locations: [] },
  { name: "Xerox / Conduent", locations: [] },
  { name: "Zenith Healthcare", locations: [] },
  { name: "Zoho", locations: [] },
  { name: "Novas RCM", locations: [] },
  { name: "Med RCM 360", locations: [] },
  { name: "Advantmed", locations: [] },
  { name: "Fedora Healthcare", locations: [] },
  { name: "DCG Datacore Pvt Ltd", locations: [] },
  { name: "Arya medical billing solutions", locations: [] },
  { name: "SVR IT Solutions", locations: [] },
  { name: "Elite RCM", locations: [] },
  { name: "Med-metrix", locations: [] },
  { name: "Calim X code", locations: [] },
  { name: "Coronis Ajuba", locations: [] },
  { name: "MiraMed Ajuba", locations: [] },
  { name: "Jindal Healthcare", locations: [] },
  { name: "Medlysis", locations: [] },
  { name: "XeroicTech Health", locations: [] },
  { name: "OG Healthcare", locations: [] },
  { name: "Apricus Technovations Private Limited", locations: [] },
  { name: "Cure coder", locations: [] },
];

export const COMPANY_NAMES = WORK_COMPANIES.map((c) => c.name);

// Used when the chosen company has no branch list yet, or the company isn't in the list.
export const WORK_LOCATION_FALLBACK = [
  "Ahmedabad", "Bengaluru", "Bhubaneswar", "Chandigarh", "Chennai", "Coimbatore", "Gurugram", "Hyderabad",
  "Indore", "Jaipur", "Kochi", "Kolkata", "Lucknow", "Madurai", "Mangaluru", "Mumbai", "Mysuru", "Nagpur",
  "Noida", "Pune", "Salem", "Thiruvananthapuram", "Tiruchirappalli", "Vijayawada", "Visakhapatnam", "Work from Home / Remote",
];

export function getCompanyLocations(companyName) {
  const co = WORK_COMPANIES.find((c) => c.name.toLowerCase() === String(companyName || "").trim().toLowerCase());
  return co && co.locations.length > 0 ? { options: co.locations, known: true } : { options: WORK_LOCATION_FALLBACK, known: false };
}
