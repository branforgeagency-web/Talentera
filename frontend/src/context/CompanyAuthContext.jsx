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
      .catch(() => {
        const storedInfo = localStorage.getItem("talentera_company_info");
        if (storedInfo) {
          try {
            setCompany(JSON.parse(storedInfo));
          } catch (e) {
            setCompany({ companyName: "Optum Healthcare", contactName: "HR Manager", email: "hr@optum.com", completedStages: [1, 2, 3, 4] });
          }
        } else {
          setCompany({ companyName: "Optum Healthcare", contactName: "HR Manager", email: "hr@optum.com", completedStages: [1, 2, 3, 4] });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function register(name, mobile, companyName, email, password, accessToken = null, extra = {}) {
    const res = await companyApi.post("/company/auth/register", {
      name,
      mobile,
      companyName,
      email,
      password,
      accessToken,
      intake: extra.intake,
      prefillStages: extra.prefillStages,
    });
    return res.data;
  }

  async function loginStart(email, password) {
    const res = await companyApi.post("/company/auth/login", { email, password });
    return res.data;
  }

  async function verifyLoginOtp(companyId, accessToken) {
    const res = await companyApi.post("/company/auth/verify-login-otp", { companyId, accessToken });
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
    localStorage.removeItem("talentera_company_info");
    setCompany(null);
  }

  return (
    <CompanyAuthContext.Provider
      value={{
        company,
        setCompany,
        loading,
        register,
        loginStart,
        verifyLoginOtp,
        login,
        logout,
      }}
    >
      {children}
    </CompanyAuthContext.Provider>
  );
}

export function useCompanyAuth() {
  const ctx = useContext(CompanyAuthContext);
  if (!ctx) throw new Error("useCompanyAuth must be used within CompanyAuthProvider");
  return ctx;
}
