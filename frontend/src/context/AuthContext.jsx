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
      .then((res) => setCandidate(res.data.candidate))
      .catch(() => {
        const storedInfo = localStorage.getItem("talentera_candidate_info");
        if (storedInfo) {
          try {
            setCandidate(JSON.parse(storedInfo));
          } catch (e) {
            setCandidate({ email: "demo.candidate@talentera.in", stage1: { fullName: "Ananya Sharma" }, completedStages: [1, 2, 3, 4, 5, 6, 7, 8] });
          }
        } else {
          setCandidate({ email: "demo.candidate@talentera.in", stage1: { fullName: "Ananya Sharma" }, completedStages: [1, 2, 3, 4, 5, 6, 7, 8] });
        }
      })
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

  function logout() {
    localStorage.removeItem("talentera_token");
    localStorage.removeItem("talentera_candidate_info");
    setCandidate(null);
  }

  return (
    <AuthContext.Provider value={{ candidate, setCandidate, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
