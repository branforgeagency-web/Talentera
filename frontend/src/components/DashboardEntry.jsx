import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { dashboardPathFor } from "../utils/candidateType.js";

// Old /dashboard links (and any /dashboard/* path) forward to the candidate's own
// dashboard, keeping the query string (?stage=3, ?tab=learn ...) intact.
export default function DashboardEntry() {
  const { candidate } = useAuth();
  const location = useLocation();
  return <Navigate to={`${dashboardPathFor(candidate)}${location.search}`} replace />;
}
