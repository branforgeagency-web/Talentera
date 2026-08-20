import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import CandidateWizard from "./pages/CandidateWizard.jsx";
import ForCompanies from "./pages/ForCompanies.jsx";
import CompanyRegister from "./pages/CompanyRegister.jsx";
import CompanyLogin from "./pages/CompanyLogin.jsx";
import CompanyPortal from "./pages/CompanyPortal.jsx";
import CompanyDashboardSetup from "./pages/CompanyDashboardSetup.jsx";
import CompanyApplicants from "./pages/CompanyApplicants.jsx";
import CompanyJobs from "./pages/CompanyJobs.jsx";
import Jobs from "./pages/Jobs.jsx";
import AcademyLogin from "./pages/AcademyLogin.jsx";
import AcademyPortal from "./pages/AcademyPortal.jsx";
import StaffLogin from "./pages/StaffLogin.jsx";
import StaffHub from "./pages/StaffHub.jsx";
import ResumeBuilder from "./pages/ResumeBuilder.jsx";
import AssessmentRunner from "./pages/AssessmentRunner.jsx";
import VerifyCandidate from "./pages/VerifyCandidate.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import CompanyRequireAuth from "./components/CompanyRequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      {/* 01. Main Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Public Candidate Credential Verification */}
      <Route path="/verify/:candidateId" element={<VerifyCandidate />} />

      {/* 02. For Companies / Hire Talent Section */}
      <Route path="/companies" element={<ForCompanies />} />
      <Route
        path="/companies/dashboard"
        element={
          <CompanyRequireAuth>
            <CompanyDashboardSetup />
          </CompanyRequireAuth>
        }
      />
      <Route
        path="/companies/onboarding"
        element={
          <CompanyRequireAuth>
            <CompanyDashboardSetup />
          </CompanyRequireAuth>
        }
      />
      <Route path="/companies/register" element={<CompanyRegister />} />
      <Route path="/companies/login" element={<CompanyLogin />} />
      <Route path="/companies/directory" element={<CompanyPortal />} />
      <Route
        path="/companies/applicants"
        element={
          <CompanyRequireAuth>
            <CompanyApplicants />
          </CompanyRequireAuth>
        }
      />
      <Route
        path="/companies/jobs"
        element={
          <CompanyRequireAuth>
            <CompanyJobs />
          </CompanyRequireAuth>
        }
      />

      {/* Candidate-facing job board - browse JDs published via Company
          onboarding Stage 9 and apply. Accessible only after candidate login. */}
      <Route
        path="/jobs"
        element={
          <RequireAuth>
            <Jobs />
          </RequireAuth>
        }
      />

      {/* 03. Employee & Staff Login */}
      <Route path="/login" element={<StaffLogin />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard/*"
        element={
          <RequireAuth>
            <CandidateWizard />
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
      <Route
        path="/assessment/run"
        element={
          <RequireAuth>
            <AssessmentRunner />
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
