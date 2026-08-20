import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({ baseURL: API_BASE });

// Attach the JWT to every request - replaces Firebase's automatic session token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("talentera_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
