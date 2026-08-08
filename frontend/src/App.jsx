import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ForCompanies from "./pages/ForCompanies.jsx";
import CompanyRegister from "./pages/CompanyRegister.jsx";
import CompanyPortal from "./pages/CompanyPortal.jsx";
import CompanyDashboardSetup from "./pages/CompanyDashboardSetup.jsx";
import AcademyLogin from "./pages/AcademyLogin.jsx";
import AcademyPortal from "./pages/AcademyPortal.jsx";
import StaffLogin from "./pages/StaffLogin.jsx";
import StaffHub from "./pages/StaffHub.jsx";
import ResumeBuilder from "./pages/ResumeBuilder.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      {/* 01. Main Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* 02. For Companies / Hire Talent Section */}
      <Route path="/companies" element={<ForCompanies />} />
      <Route path="/companies/dashboard" element={<CompanyDashboardSetup />} />
      <Route path="/companies/onboarding" element={<CompanyDashboardSetup />} />
      <Route path="/companies/register" element={<CompanyRegister />} />
      <Route path="/companies/directory" element={<CompanyPortal />} />

      {/* 03. Employee & Staff Login */}
      <Route path="/login" element={<StaffLogin />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/resume"
        element={
          <RequireAuth>
            <ResumeBuilder />
          </RequireAuth>
        }
      />

      {/* 04. Academy Partner Portal */}
      <Route path="/academy" element={<AcademyLogin />} />
      <Route path="/academy/login" element={<AcademyLogin />} />
      <Route path="/academy/*" element={<AcademyPortal />} />

      {/* 05. Staff Operations Hub */}
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/*" element={<StaffHub />} />

      {/* Catch-all redirect to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
