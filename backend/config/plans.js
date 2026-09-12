/**
 * Static plan catalog - billing SCAFFOLDING ONLY, no payment gateway wired.
 *
 * Per the user's explicit choice (Aug 2026 roadmap follow-up), this pass
 * builds the data model and feature-gating for company subscription plans
 * without live payment collection - see IMPROVEMENT_ROADMAP.md "No plans,
 * seats, or billing." A real gateway (Razorpay is the natural fit given the
 * India focus; Stripe is the alternative) can be wired in later behind
 * POST /api/company/billing/checkout without touching the gating logic
 * below, since that logic only cares about `company.plan`.
 *
 * Kept as static config rather than a Plan collection for now - there's no
 * admin UI need to add/remove plans dynamically yet, and a hardcoded list
 * is one less thing that can drift out of sync with the gating code that
 * reads it. Promote to a DB-backed Plan model if/when that changes.
 */
const PLANS = {
  free: {
    id: "free",
    label: "Free",
    name: "Free Tier",
    maxActiveJobPosts: 1,
    candidatePoolSearch: false,
    viewCandidateScoresAndCerts: false,
    candidateShortlisting: false,
    customQuestionBanks: false,
    customScreeningRubrics: false,
    integrationsAtsHris: false,
    priorityKycAudit: false,
    prioritySupport: false,
    dedicatedAccountManager: false,
    monthlyPriceInr: 0,
  },
  growth: {
    id: "growth",
    label: "Growth",
    name: "Growth Tier",
    maxActiveJobPosts: 5,
    candidatePoolSearch: true,
    viewCandidateScoresAndCerts: true,
    candidateShortlisting: true,
    customQuestionBanks: false,
    customScreeningRubrics: false,
    integrationsAtsHris: false,
    priorityKycAudit: true,
    prioritySupport: true,
    dedicatedAccountManager: false,
    monthlyPriceInr: 4999,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    name: "Enterprise Tier",
    maxActiveJobPosts: null, // null = unlimited
    candidatePoolSearch: true,
    viewCandidateScoresAndCerts: true,
    candidateShortlisting: true,
    customQuestionBanks: true,
    customScreeningRubrics: true,
    integrationsAtsHris: true,
    priorityKycAudit: true,
    prioritySupport: true,
    dedicatedAccountManager: true,
    monthlyPriceInr: 19999,
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

// true if `plan.maxActiveJobPosts` represents "no limit" (Enterprise).
function isUnlimitedJobPosts(plan) {
  return plan.maxActiveJobPosts === null || plan.maxActiveJobPosts === undefined;
}

// Whichever plan gating needs a "is activeCount still under the cap?"
// check should go through this helper rather than comparing
// `activeCount < plan.maxActiveJobPosts` directly, since that comparison is
// wrong (always false) once maxActiveJobPosts is null for "unlimited".
function isUnderJobPostLimit(plan, activeCount) {
  if (isUnlimitedJobPosts(plan)) return true;
  return activeCount < plan.maxActiveJobPosts;
}

module.exports = { PLANS, getPlan, isUnlimitedJobPosts, isUnderJobPostLimit };
