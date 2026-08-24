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
    maxActiveJobPosts: 1,
    candidatePoolSearch: false,
    monthlyPriceInr: 0,
  },
  growth: {
    id: "growth",
    label: "Growth",
    maxActiveJobPosts: 5,
    candidatePoolSearch: true,
    monthlyPriceInr: 4999,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    // BUG FIX (2026-08-21): this was JS `Infinity`, which isn't valid JSON -
    // JSON.stringify silently turns it into `null` on the way out of
    // GET /api/company/billing and GET /api/staff/plans, so any frontend
    // reading this field would have seen `maxActiveJobPosts: null` for
    // Enterprise (and `activeCount < null` is always false in JS, which
    // would incorrectly block Enterprise companies from posting more jobs
    // the moment a UI consumed this field). `null` is now the deliberate,
    // documented sentinel for "unlimited" - see isUnlimitedJobPosts() /
    // isUnderJobPostLimit() below, which every caller should use instead of
    // comparing directly against this field.
    maxActiveJobPosts: null, // null = unlimited
    candidatePoolSearch: true,
    monthlyPriceInr: null, // "Contact sales"
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
