import React from "react";
import { useCompanyAuth } from "../../context/CompanyAuthContext.jsx";

// Renders its children only for the company head admin (not for team logins).
export default function HeadOnly({ children }) {
  const { company } = useCompanyAuth();
  if (company?.teamUser) return null;
  return <>{children}</>;
}
