import axios from "axios";

let rawBase = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://127.0.0.1:5000/api" : "/api")).trim();
if (rawBase.endsWith("/")) rawBase = rawBase.slice(0, -1);
if (!rawBase.endsWith("/api")) {
  rawBase = `${rawBase}/api`;
}
export const API_BASE = rawBase;

const api = axios.create({ baseURL: API_BASE });

// Attach the JWT to every request - replaces Firebase's automatic session token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("talentera_token") || (import.meta.env.DEV ? "demo_candidate_token_12345" : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // When sending FormData, let the browser/Axios set the multipart boundary automatically
  if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  return config;
});

// If the token expires/invalidates, bounce back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("talentera_token");
      if (window.location.pathname.startsWith("/dashboard")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
