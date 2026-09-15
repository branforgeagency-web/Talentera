import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on page refresh
  useEffect(() => {
    const token = localStorage.getItem("talentera_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        if (res.data?.candidate) {
          setCandidate(res.data.candidate);
        } else {
          localStorage.removeItem("talentera_token");
          localStorage.removeItem("talentera_candidate_info");
          setCandidate(null);
        }
      })
      .catch((err) => {
        // If token is invalid or candidate no longer exists in DB, clean up stale credentials
        if (err.response?.status === 401 || err.response?.status === 404) {
          localStorage.removeItem("talentera_token");
          localStorage.removeItem("talentera_candidate_info");
        }
        setCandidate(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function register(email, password, mobile, accessToken, inviteToken) {
    const res = await api.post("/auth/register", { email, password, mobile, accessToken, inviteToken });
    localStorage.setItem("talentera_token", res.data.token);
    setCandidate(res.data.candidate);
    return res.data.candidate;
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("talentera_token", res.data.token);
    setCandidate(res.data.candidate);
    return res.data.candidate;
  }

  async function demoLogin() {
    const res = await api.post("/auth/demo-login");
    localStorage.setItem("talentera_token", res.data.token);
    setCandidate(res.data.candidate);
    return res.data.candidate;
  }

  function logout() {
    localStorage.removeItem("talentera_token");
    localStorage.removeItem("talentera_candidate_info");
    setCandidate(null);
  }

  return (
    <AuthContext.Provider value={{ candidate, setCandidate, loading, register, login, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
