import React, { createContext, useContext, useEffect, useState } from "react";
import companyApi from "../api/companyClient";

const CompanyAuthContext = createContext(null);

export function CompanyAuthProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("talentera_company_token");
    if (!token) {
      setLoading(false);
      return;
    }
    companyApi
      .get("/company/auth/me")
      .then((res) => setCompany(res.data.company))
      .catch(() => localStorage.removeItem("talentera_company_token"))
      .finally(() => setLoading(false));
  }, []);

  async function register(name, mobile, companyName, email, password) {
    const res = await companyApi.post("/company/auth/register", { name, mobile, companyName, email, password });
    localStorage.setItem("talentera_company_token", res.data.token);
    setCompany(res.data.company);
    return res.data.company;
  }

  async function login(email, password) {
    const res = await companyApi.post("/company/auth/login", { email, password });
    localStorage.setItem("talentera_company_token", res.data.token);
    setCompany(res.data.company);
    return res.data.company;
  }

  function logout() {
    localStorage.removeItem("talentera_company_token");
    setCompany(null);
  }

  return (
    <CompanyAuthContext.Provider value={{ company, setCompany, loading, register, login, logout }}>
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  return ctx;
}
