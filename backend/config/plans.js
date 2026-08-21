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
    maxActiveJobPosts: Infinity,
    candidatePoolSearch: true,
    monthlyPriceInr: null, // "Contact sales"
  },
};

function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

module.exports = { PLANS, getPlan };
