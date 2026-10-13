import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

const PLAN_CARDS = [
  {
    id: "free",
    name: "Free Tier",
    price: "₹0",
    period: "forever",
    tagline: "Ideal for trying out Talentera and single vacancy requirements.",
    badge: null,
    highlight: false,
    features: [
      { text: "1 Active Job Post at a time", included: true },
      { text: "Public candidate applications & resumes", included: true },
      { text: "Applicant review & hiring pipeline", included: true },
      { text: "Standard email support", included: true },
      { text: "Direct candidate directory search", included: false },
      { text: "Custom interview question banks", included: false },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    id: "growth",
    name: "Growth Tier",
    price: "₹4,999",
    period: "per month",
    tagline: "Designed for active healthcare RCM teams, clinics & growing operations.",
    badge: "MOST POPULAR · RECOMMENDED",
    highlight: true,
    features: [
      { text: "5 Active Job Posts simultaneously", included: true },
      { text: "Direct verified candidate search & filtering", included: true },
      { text: "Full candidate scores & verified certificates", included: true },
      { text: "Candidate shortlisting & pipeline actions", included: true },
      { text: "Priority KYC verification audit", included: true },
      { text: "Priority email & chat support", included: true },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Tier",
    price: "₹19,999",
    period: "per month",
    tagline: "For hospitals, large RCM enterprises, and multi-location recruiters.",
    badge: "UNLIMITED HIRING",
    highlight: false,
    features: [
      { text: "Unlimited Active Job Posts", included: true },
      { text: "Full candidate pool access & talent sourcing", included: true },
      { text: "Custom screening rubrics & question banks", included: true },
      { text: "ATS & HRIS webhook / API integrations", included: true },
      { text: "Dedicated Talentera account manager", included: true },
      { text: "Custom SLAs & express KYC auditing", included: true },
      { text: "Centralized multi-admin team management", included: true },
    ],
  },
];

export default function CompanyBilling() {
  const navigate = useNavigate();
  const toast = useToast();
  const { company, setCompany, logout } = useCompanyAuth();

  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetPlanToChange, setTargetPlanToChange] = useState(null);
  const [changingPlan, setChangingPlan] = useState(false);

  useEffect(() => {
    fetchBilling();
  }, []);

  async function fetchBilling() {
    setLoading(true);
    try {
      const res = await companyApi.get("/company/billing");
      setBillingData(res.data);
    } catch (err) {
      console.error(err);
      toast("Couldn't load billing info. Please refresh.", "!");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPlanChange() {
    if (!targetPlanToChange) return;
    setChangingPlan(true);
    try {
      const res = await companyApi.post("/company/billing/change-plan", {
        plan: targetPlanToChange.id,
      });
      toast(res.data?.message || "Plan updated successfully!", "✓");
      if (res.data?.company) {
        setCompany(res.data.company);
      }
      setBillingData((prev) => ({
        ...prev,
        plan: res.data?.plan || { id: targetPlanToChange.id },
        planAssignedAt: res.data?.planAssignedAt || new Date().toISOString(),
        usage: res.data?.usage || prev?.usage,
      }));
      setTargetPlanToChange(null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update plan tier.", "!");
    } finally {
      setChangingPlan(false);
    }
  }

  const currentPlanId = billingData?.plan?.id || company?.plan || "free";
  const currentPlanConfig = PLAN_CARDS.find((p) => p.id === currentPlanId) || PLAN_CARDS[0];
  const activeJobs = billingData?.usage?.activeJobPosts || 0;
  const maxJobs = billingData?.usage?.maxActiveJobPosts;
  const isUnlimitedJobs = maxJobs === null || maxJobs === undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)", fontFamily: "var(--font-body)" }}>
      {/* STICKY TOPNAV */}
      <header
        style={{
          background: "var(--navy)",
          padding: "16px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/companies/dashboard")}>
          <img src="/logo-white.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
            PLAN &amp; BILLING
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link
            to="/companies/directory"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Hire Verified Talent
          </Link>
          <Link
            to="/companies/jobs"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Job Posts
          </Link>
          <Link
            to="/companies/applicants"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Applicants
          </Link>
          <Link
            to="/companies/billing"
            style={{
              color: "var(--gold)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              padding: "6px 12px",
              background: "rgba(229,168,46,0.12)",
              borderRadius: 6,
            }}
          >
            Plan &amp; Billing
          </Link>
          <Link
            to="/companies/dashboard"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}
          >
            Edit Profile
          </Link>

          {company && (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/companies");
              }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(229,168,46,0.15)",
              color: "var(--gold-dark, #B45309)",
              fontSize: 11.5,
              fontWeight: 800,
              letterSpacing: "0.08em",
              padding: "4px 12px",
              borderRadius: 20,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            <span>💎</span> SUBSCRIPTION &amp; PLAN TIERS
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--navy)", margin: "0 0 10px" }}>
            Manage Your Company Plan
          </h1>
          <p style={{ fontSize: 15, color: "#64748B", maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>
            Upgrade or switch tiers at any time to unlock more active job requisitions and direct verified candidate search.
          </p>
        </div>

        {/* CURRENT PLAN & USAGE OVERVIEW */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1.5px solid #E2E8F0",
            borderRadius: 16,
            padding: "24px 32px",
            marginBottom: 40,
            boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              CURRENT SUBSCRIPTION
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "var(--navy)" }}>
                {currentPlanConfig.name}
              </span>
              <span
                style={{
                  background: currentPlanId === "enterprise" ? "#E0E7FF" : currentPlanId === "growth" ? "#DCFCE7" : "#F1F5F9",
                  color: currentPlanId === "enterprise" ? "#4338CA" : currentPlanId === "growth" ? "#15803D" : "#475569",
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 20,
                }}
              >
                ACTIVE TIER
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>
              {billingData?.planAssignedAt
                ? `Plan active since ${new Date(billingData.planAssignedAt).toLocaleDateString()}`
                : "Active on default tier"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
              ACTIVE JOB REQUISITIONS
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              <span>{activeJobs} Active</span>
              <span style={{ color: "#64748B" }}>
                {isUnlimitedJobs ? "Unlimited Allowance" : `Max ${maxJobs} Posts`}
              </span>
            </div>
            <div style={{ height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: isUnlimitedJobs ? "25%" : `${Math.min(100, Math.round((activeJobs / (maxJobs || 1)) * 100))}%`,
                  background: !isUnlimitedJobs && activeJobs >= (maxJobs || 1) ? "#EF4444" : "var(--gold)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              CANDIDATE SEARCH ACCESS
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>
                {currentPlanId === "free" ? "🔒" : "⚡"}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: currentPlanId === "free" ? "#94A3B8" : "#15803D" }}>
                {currentPlanId === "free" ? "Search Locked (Free)" : "Direct Candidate Search Unlocked"}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 4 }}>
              {currentPlanId === "free"
                ? "Upgrade to Growth or Enterprise to search verified talent."
                : "Search and filter certified medical coders and billers."}
            </div>
          </div>
        </div>

        {/* PLAN CARDS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "stretch" }}>
          {PLAN_CARDS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 18,
                  border: isCurrent
                    ? "2.5px solid var(--gold)"
                    : plan.highlight
                    ? "2px solid #E2E8F0"
                    : "1px solid #E2E8F0",
                  padding: "32px 28px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: isCurrent
                    ? "0 12px 32px rgba(229,168,46,0.18)"
                    : "0 4px 20px rgba(0,0,0,0.03)",
                  transform: plan.highlight && !isCurrent ? "translateY(-4px)" : "none",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: plan.id === "growth" ? "var(--gold)" : "var(--navy)",
                      color: plan.id === "growth" ? "var(--navy)" : "#fff",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      padding: "4px 14px",
                      borderRadius: 12,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {plan.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "10px 0 6px" }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: "var(--navy)", fontFamily: "var(--font-display)" }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>/ {plan.period}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0, minHeight: 38, lineHeight: 1.45 }}>
                    {plan.tagline}
                  </p>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #F1F5F9", margin: "16px 0 24px" }} />

                <div style={{ flex: 1, marginBottom: 28 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                    PLAN FEATURES
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                    {plan.features.map((f, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: f.included ? "var(--navy)" : "#94A3B8" }}>
                        <span style={{ fontSize: 14, color: f.included ? "#16A34A" : "#CBD5E1", flexShrink: 0, marginTop: 1 }}>
                          {f.included ? "✓" : "✕"}
                        </span>
                        <span style={{ textDecoration: f.included ? "none" : "line-through" }}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: "2px solid #E2E8F0",
                        background: "#F8FAFC",
                        color: "#64748B",
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: "default",
                      }}
                    >
                      ✓ Current Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTargetPlanToChange(plan)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: "none",
                        background: plan.highlight ? "var(--gold)" : "var(--navy)",
                        color: plan.highlight ? "var(--navy)" : "#fff",
                        fontSize: 13.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: plan.highlight ? "0 4px 14px rgba(229,168,46,0.3)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {plan.id === "free" ? "Switch to Free Tier" : `Switch to ${plan.name}`} →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div style={{ marginTop: 60, background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", padding: "32px 36px" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", marginBottom: 20 }}>
            Frequently Asked Questions
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                Can our company switch plans anytime?
              </h4>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, margin: 0 }}>
                Yes. You can switch between Free, Growth, and Enterprise tiers at any time directly from this portal. Changes take effect immediately.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                What happens to active jobs if I downgrade?
              </h4>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, margin: 0 }}>
                Existing jobs will remain visible. However, you will not be able to publish new requisitions until your active count is within the new plan's allowance.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                How does Candidate Search gating work?
              </h4>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, margin: 0 }}>
                Growth and Enterprise plans provide direct access to search, filter, and shortlist candidate profiles by test scores, certifications, and experience.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* CONFIRMATION MODAL */}
      {targetPlanToChange && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => !changingPlan && setTargetPlanToChange(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: "28px 24px",
              boxShadow: "0 20px 45px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔄</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>
              Confirm Plan Tier Change
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.5, margin: "0 0 20px" }}>
              You are about to switch your subscription plan from{" "}
              <strong style={{ color: "var(--navy)" }}>{currentPlanConfig.name}</strong> to{" "}
              <strong style={{ color: "var(--gold-dark, #B45309)" }}>{targetPlanToChange.name}</strong> ({targetPlanToChange.price} / {targetPlanToChange.period}).
            </p>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
                WHAT YOU'LL GET:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                {targetPlanToChange.id === "growth" && (
                  <>
                    <li>Up to <strong>5 active job posts</strong> simultaneously</li>
                    <li>Direct verified candidate directory search &amp; filter</li>
                    <li>Candidate shortlisting and outreach pipeline</li>
                  </>
                )}
                {targetPlanToChange.id === "enterprise" && (
                  <>
                    <li><strong>Unlimited active job postings</strong></li>
                    <li>Full candidate database access &amp; talent export</li>
                    <li>Custom question banks, rubrics &amp; dedicated account manager</li>
                  </>
                )}
                {targetPlanToChange.id === "free" && (
                  <>
                    <li>1 active job post allowance</li>
                    <li>Public candidate job applications tracking</li>
                  </>
                )}
              </ul>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={changingPlan}
                onClick={() => setTargetPlanToChange(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1.5px solid #CBD5E1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={changingPlan}
                onClick={handleConfirmPlanChange}
                style={{
                  padding: "10px 22px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--gold)",
                  color: "var(--navy)",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {changingPlan ? "Updating Plan…" : `Confirm Switch to ${targetPlanToChange.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}