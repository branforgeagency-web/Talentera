/**
 * Static "who's hiring right now" content for the wizard's right-hand
 * companies rail. Decorative/marketing content only — no backend needed.
 */

export const HIRING_TICKER = {
  companiesHiring: 47,
  openRoles: 156,
  lastHire: "8 min ago",
};

export const HIRING_COMPANIES = [
  {
    name: "Optum India",
    initial: "O",
    gradient: "linear-gradient(135deg, #FF6B35, #F7931E)",
    location: "Hyderabad · Onsite",
    salary: "5.5–7.0 LPA",
    openRoles: 12,
    tags: ["HCC", "Urgent"],
    hot: true,
    note: "92% verified-pool hires",
  },
  {
    name: "Cognizant",
    initial: "C",
    gradient: "linear-gradient(135deg, #1A73E8, #0D47A1)",
    location: "Hyderabad · Remote",
    salary: "5.0–7.0 LPA",
    openRoles: 8,
    tags: ["Remote", "US shift"],
    hot: false,
    note: "88% verified-pool hires",
  },
  {
    name: "Access Healthcare",
    initial: "A",
    gradient: "linear-gradient(135deg, #16A34A, #15803D)",
    location: "Hyderabad · Hybrid",
    salary: "6.0–8.5 LPA",
    openRoles: 6,
    tags: ["Featured"],
    hot: false,
    note: "95% verified-pool hires",
  },
  {
    name: "Omega Healthcare",
    initial: "Ω",
    gradient: "linear-gradient(135deg, #7C3AED, #5B21B6)",
    location: "Hyderabad · Onsite",
    salary: "4.8–6.5 LPA",
    openRoles: 5,
    tags: ["E/M Coder"],
    hot: false,
    note: "90% verified-pool hires",
  },
  {
    name: "R1 RCM India",
    initial: "R1",
    gradient: "linear-gradient(135deg, #DC2626, #991B1B)",
    location: "Hyderabad · Onsite",
    salary: "4.5–6.5 LPA",
    openRoles: 9,
    tags: ["Walk-in"],
    hot: true,
    note: "85% verified-pool hires",
  },
];

export const RCM_INDUSTRY_STATS = [
  { value: "$4.5T", label: "US healthcare market" },
  { value: "1.2L", label: "RCM jobs/year in India" },
  { value: "+18%", label: "YoY salary growth" },
  { value: "87%", label: "hiring managers prefer Talentera-Verified" },
];
