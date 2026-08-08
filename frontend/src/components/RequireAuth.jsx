import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { candidate, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-heading)" }}>
        Loading your account…
      </div>
    );
  }

  if (!candidate) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
