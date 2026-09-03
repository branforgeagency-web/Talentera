import axios from "axios";

let rawBase = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:5000/api" : "/api")).trim();
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
if (!rawBase.endsWith("/api")) {
  rawBase = `${rawBase}/api`;
}
export const COMPANY_API_BASE = rawBase;

const companyApi = axios.create({ baseURL: COMPANY_API_BASE });

// Kept in a separate localStorage key from the candidate token
// (talentera_token) so a person could in theory be signed in as both a
// candidate and a company in the same browser.
companyApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("talentera_company_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

companyApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("talentera_company_token");
      if (window.location.pathname.startsWith("/companies/onboarding") || window.location.pathname.startsWith("/companies/dashboard")) {
        window.location.href = "/companies";
      }
    }
    return Promise.reject(err);
  }
);

export default companyApi;
