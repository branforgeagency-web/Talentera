// Payments / plan tiers are switched off while clients test the dashboards.
// Flip to true to bring plan gating, upgrade prompts and the Plan & Billing page back.
export const BILLING_ENABLED = false;

// With billing off every company gets full access (no "free tier" locks or upgrade prompts).
export const effectivePlan = (plan) => (BILLING_ENABLED ? plan || "free" : "enterprise");
