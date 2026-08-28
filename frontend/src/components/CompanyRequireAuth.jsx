import React from "react";
import { Navigate } from "react-router-dom";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";

export default function CompanyRequireAuth({ children }) {
  const { company, loading } = useCompanyAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        Loading your company account…
      </div>
    );
  }

  if (!company) {
    return <Navigate to="/companies/login" replace />;
  }

  return children;
}
