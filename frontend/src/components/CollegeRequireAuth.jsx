import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function CollegeRequireAuth({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("talentera_college_token");
    if (!token) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    // Verify token with backend
    fetch("/api/college/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("talentera_college_token");
          localStorage.removeItem("talentera_college_info");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        // Fallback for local demo tokens
        if (token.startsWith("demo_college_")) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)", background: "#0A1F3D", color: "#F5B41A" }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: 10, fontSize: 24 }}></i>
        Connecting to College Placement Dashboard…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/college/login" replace />;
  }

  return children;
}
