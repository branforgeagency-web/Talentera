import axios from "axios";

const companyApi = axios.create({ baseURL: "/api" });

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
