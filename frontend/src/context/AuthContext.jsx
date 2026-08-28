import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session

  // Restore session on page refresh (replaces Firebase's persistent auth state)
  useEffect(() => {
    const token = localStorage.getItem("talentera_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setCandidate(res.data.candidate))
      .catch(() => localStorage.removeItem("talentera_token"))
      .finally(() => setLoading(false));
  }, []);

  async function register(email, password, mobile) {
    const res = await api.post("/auth/register", { email, password, mobile });
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
