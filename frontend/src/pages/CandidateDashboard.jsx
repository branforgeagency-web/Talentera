import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import CandidateResumeSection from '../components/CandidateResumeSection.jsx';
import { exportResumeWord } from '../utils/resumeExport.js';
import CandidateDocumentsSection from '../components/CandidateDocumentsSection.jsx';
import BrowseJobsSection from '../components/BrowseJobsSection.jsx';
import CandidateReferralPortalSection from '../components/CandidateReferralPortalSection.jsx';
import CandidateEmployerReferralsSection from '../components/CandidateEmployerReferralsSection.jsx';
import CandidateAcademyReferralsSection from '../components/CandidateAcademyReferralsSection.jsx';
import './CandidateDashboard.css';

// Real dynamic verification score calculator across Stages 1–8
export function calculateRealStageScore(profile) {
  if (!profile) return 0;
  const completedStages = Array.isArray(profile.completedStages) ? profile.completedStages : [];
  let score = 0;

  // Stage 1: Basic Identity & Aadhaar OTP (+5 pts)
  if (completedStages.includes(1) || profile.stage1?.aadhaarVerified || profile.stage1?.fullName || profile.stage1?.fullname) {
    score += 5;
  }

  // Stage 2: Foundation & Academics (+15 pts)
  if (completedStages.includes(2) || profile.stage2?.academyName || profile.stage2?.instituteName || profile.stage2?.domain) {
    score += 15;
  }

  // Stage 3: Certification (+20 pts)
  if (completedStages.includes(3) || (profile.stage3?.certifications?.length > 0) || profile.stage3?.certCode) {
    if (profile.stage3?.certStatus === 'verified' || profile.stage3?.status === 'verified' || profile.stage3?.verified === true) {
      score += 20;
    } else {
      score += 15;
    }
  }

  // Stage 4: Domain Assessment (+25 pts)
  if (completedStages.includes(4) || profile.stage4?.score !== undefined || profile.stage4?.foundationScore !== undefined) {
    const fScore = profile.stage4?.foundationScore !== undefined ? Number(profile.stage4.foundationScore) : (profile.stage4?.score !== undefined ? Number(profile.stage4.score) : 0);
    if (profile.stage4?.passed === true || fScore >= 70) {
      score += 25;
    } else if (fScore > 0) {
      score += Math.round((fScore / 100) * 25);
    } else {
      score += 15;
    }
  }

  // Stage 5: Video Pitch & AI Communication (+10 pts)
  if (completedStages.includes(5) || profile.stage5?.overallScore != null || profile.stage5?.verified) {
    score += 10;
  }

  // Stage 6: Live Charts Audit (+10 pts)
  if (completedStages.includes(6) || (profile.stage6?.totalCharts || 0) > 0 || profile.stage6?.evidencePath) {
    const s6 = profile.stage6 || {};
    const opt = (s6.evidencePath || s6.option || '').toLowerCase();
    if (opt === 'a' || opt.includes('api') || opt === 'practicode') {
      score += 10;
    } else if (opt === 'b' || opt.includes('academy') || opt === 'upload') {
      score += 10;
    } else if (opt === 'c' || opt.includes('self') || opt === 'declare') {
      score += 8;
    } else {
      score += 10;
    }
  }

  // Stage 7: Resume (+10 pts)
  if (completedStages.includes(7) || profile.stage7?.objective || profile.stage7?.skills || profile.manualResume || profile.resumeUrl) {
    score += 10;
  }

  // Stage 8: Placement & Live For Hiring Track (+5 pts)
  if (completedStages.includes(8) || profile.stage8?.liveForHiring !== undefined || profile.stage8?.employmentStatus) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

export default function CandidateDashboard({ profile: propProfile, onEditStage }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const sidebarRef = useRef(null);

  // Sign out and redirect to homepage
  const handleSignOut = () => {
    try {
      if (typeof logout === 'function') logout();
    } catch {
      localStorage.removeItem('talentera_token');
      localStorage.removeItem('talentera_candidate_info');
    }
    navigate('/');
  };

  // Helper to open the Candidate 8 Stages Dashboard / Wizard at any specific stage
  const handleOpenStagesWizard = (stageNum = 1) => {
    if (typeof onEditStage === 'function') {
      onEditStage(stageNum);
    } else {
      navigate(`/dashboard?stage=${stageNum}`);
    }
  };
  const [profile, setProfile] = useState(propProfile || null);
  const [loading, setLoading] = useState(!propProfile);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [referralModal, setReferralModal] = useState({ open: false, title: '', sub: '', link: '' });
  const [showReferralInfoModal, setShowReferralInfoModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [jobLocationFilter, setJobLocationFilter] = useState('');
  const [jobSpecialtyFilter, setJobSpecialtyFilter] = useState('');
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [academyForm, setAcademyForm] = useState({ studentName: '', studentEmail: '', studentMobile: '', course: '', batchPreference: '', notes: '' });
  const [submittingAcademyRef, setSubmittingAcademyRef] = useState(false);
  const [employerForm, setEmployerForm] = useState({ companyName: '', contactPerson: '', designation: '', workEmail: '', phone: '', hiringNeeds: '', hiringVolume: '', city: '', notes: '' });
  const [submittingEmployerRef, setSubmittingEmployerRef] = useState(false);
  const [employmentForm, setEmploymentForm] = useState({ companyName: '', role: '', specialty: '', location: '', joiningDate: '', ctc: '', employmentType: 'Full Time · Permanent', uan: '', manager: '', project: '' });
  const [savingEmployment, setSavingEmployment] = useState(false);

  // Real Database Collections
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invites, setInvites] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let p = null;
      try {
        const res = await api.get('/candidate/profile');
        if (res.data?.candidate) {
          p = { ...res.data.candidate, score: res.data.score, verificationScore: res.data.score };
        } else {
          p = res.data;
        }
      } catch (err) {
        try {
          const resMe = await api.get('/candidate/me');
          if (resMe.data?.candidate) {
            p = { ...resMe.data.candidate, score: resMe.data.score, verificationScore: resMe.data.score };
          } else {
            p = resMe.data;
          }
        } catch (e) {
          const resAuth = await api.get('/auth/me');
          p = resAuth.data?.user || resAuth.data;
        }
      }
      setProfile(p);

      try {
        const resJobs = await api.get('/candidate/jobs');
        setJobs(resJobs.data?.jobs || resJobs.data || []);
      } catch (e) {}

      try {
        const resApps = await api.get('/candidate/applications');
        setApplications(resApps.data?.applications || resApps.data || []);
      } catch (e) {}

      try {
        const resComps = await api.get('/candidate/companies');
        setCompanies(resComps.data?.companies || resComps.data || []);
      } catch (e) {}

      try {
        const resInv = await api.get('/candidate/invites');
        setInvites(resInv.data?.invites || resInv.data || []);
      } catch (e) {}

      try {
        const resRef = await api.get('/candidate/referrals');
        setReferrals(resRef.data || {});
      } catch (e) {}

      try {
        const resVault = await api.get('/candidate/vault');
        setVaultDocs(resVault.data?.documentVault || resVault.data?.documents || resVault.data?.vault || []);
      } catch (e) {}

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    }
  }, [propProfile]);

  useEffect(() => {
    if (sidebarRef.current) {
      const activeItem =
        sidebarRef.current.querySelector(`[data-tab="${activeTab}"]`) ||
        sidebarRef.current.querySelector('.sb-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    // Also smoothly scroll the main window to the top on tab change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const completedStages = profile?.completedStages || [];
  const candidateName = profile?.stage1?.fullName || profile?.stage1?.fullname || profile?.fullname || (profile?.email ? profile.email.split('@')[0] : 'Candidate');
  const candidateEmail = profile?.email || '';
  const candidatePhone = profile?.stage1?.mobile || profile?.mobile || '';
  // Real dynamic verification score computed from previous stages
  const profileScore = profile?.score ?? profile?.verificationScore ?? calculateRealStageScore(profile);
  const profileCompleteness = Math.min(100, Math.round((completedStages.length / 8) * 100));
  const referralCode = profile?._id ? profile._id.slice(-6).toUpperCase() : 'TALENT';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${profile?._id || ''}` : '';

  // ---- Real derived stats (computed from fetched profile/applications/invites -- no mock data) ----
  const uniqueCompanyIds = new Set(applications.map((a) => String(a.companyId?._id || a.companyId || '')).filter(Boolean));
  const companiesAttendedCount = uniqueCompanyIds.size;
  const hiredApplications = applications.filter((a) => a.status === 'hired');
  const offersReceivedCount = hiredApplications.length;
  const bestOfferCtc = hiredApplications.reduce((max, a) => Math.max(max, Number(a.compMax) || 0), 0);
  const chartsCoded = profile?.stage6?.totalCharts || 0;
  const pendingInvites = invites.filter((i) => i.status !== 'confirmed');
  const badgeCriteria = [
    { key: 'aadhaar', label: 'Aadhaar Identity Verified', icon: '🪪', earned: !!profile?.stage1?.aadhaarVerified },
    { key: 'academy', label: 'Academy Foundation Complete', icon: '🎓', earned: completedStages.includes(2) },
    { key: 'cert', label: 'Certification Verified', icon: '📜', earned: profile?.stage3?.certStatus === 'verified' },
    { key: 'assessment', label: 'Assessment Passed', icon: '🧠', earned: !!(profile?.stage4?.passed) },
    { key: 'video', label: 'Video Pitch Verified', icon: '🎥', earned: !!(profile?.stage5?.verified) },
    { key: 'charts', label: 'Live Charts Logged', icon: '💻', earned: (profile?.stage6?.totalCharts || 0) > 0 },
    { key: 'resume', label: 'Resume Built', icon: '📄', earned: completedStages.includes(7) },
    { key: 'track', label: 'Employment Status Set', icon: '📍', earned: completedStages.includes(8) },
  ];
  const badgesEarnedCount = badgeCriteria.filter((b) => b.earned).length;

  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  const handleApplyToJob = async (job) => {
    if (appliedJobIds.has(job.jobId) || applyingJobId) return;
    setApplyingJobId(job.jobId);
    try {
      await api.post(`/candidate/apply/${job.jobId}`, {});
      triggerToast(`Application sent to ${job.company}.`);
      const resApps = await api.get('/candidate/applications');
      setApplications(resApps.data?.applications || resApps.data || []);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not submit application.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleSubmitAcademyReferral = async () => {
    if (!academyForm.studentName || !academyForm.studentMobile || !academyForm.course) {
      triggerToast('Student name, mobile, and course are required.');
      return;
    }
    setSubmittingAcademyRef(true);
    try {
      const res = await api.post('/candidate/referrals/submit-academy', academyForm);
      triggerToast(res.data?.message || 'Academy referral submitted!');
      setReferrals((prev) => ({ ...prev, academyReferrals: res.data?.academyReferrals || prev.academyReferrals }));
      setAcademyForm({ studentName: '', studentEmail: '', studentMobile: '', course: '', batchPreference: '', notes: '' });
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not submit referral.');
    } finally {
      setSubmittingAcademyRef(false);
    }
  };

  const handleSubmitEmployerReferral = async () => {
    if (!employerForm.companyName || !employerForm.contactPerson || (!employerForm.workEmail && !employerForm.phone)) {
      triggerToast('Company name, contact person, and email or phone are required.');
      return;
    }
    setSubmittingEmployerRef(true);
    try {
      const res = await api.post('/candidate/referrals/submit-employer', employerForm);
      triggerToast(res.data?.message || 'Employer lead submitted!');
      setReferrals((prev) => ({ ...prev, employerReferrals: res.data?.employerReferrals || prev.employerReferrals }));
      setEmployerForm({ companyName: '', contactPerson: '', designation: '', workEmail: '', phone: '', hiringNeeds: '', hiringVolume: '', city: '', notes: '' });
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not submit lead.');
    } finally {
      setSubmittingEmployerRef(false);
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = () => {
    // Switch to the Resume tab where full interactive PDF exporter is available
    setActiveTab('resume');
    triggerToast('Switched to Verified Resume tab — ready to download verified PDF!');
  };

  // Handle DOCX / Word Download
  const handleDownloadDocx = () => {
    try {
      exportResumeWord({
        fullName: candidateName,
        email: candidateEmail,
        mobile: candidatePhone,
        locality: profile?.stage1?.city ? `${profile?.stage1?.city}, India` : 'India',
        currentRoleTitle: profile?.stage1?.currentRole || 'Medical Coding Specialist',
        careerObjective: profile?.stage7?.objective || profile?.stage7?.summary || profile?.stage1?.summary || 'Dedicated healthcare documentation specialist.',
        degree: profile?.stage1?.degree || profile?.stage2?.degree || "Bachelor's Degree",
        collegeName: profile?.stage1?.collegeName || profile?.stage2?.college || 'University',
        graduationYear: profile?.stage1?.graduationYear || profile?.stage2?.gradYear || '',
        cgpa: profile?.stage1?.cgpa || profile?.stage2?.cgpa || '',
        totalPoints: profile?.score || 85,
        verificationId: profile?.verificationId || (profile?._id ? `TLR-2026-${String(profile._id).slice(-6).toUpperCase()}` : 'TLR-2026-VERIFIED'),
        liveResumeUrl: window.location.origin + '/candidate/resume/' + (profile?._id || ''),
      });
      triggerToast('Resume Word document (.doc) downloaded with verified formatting!');
    } catch (err) {
      console.error('Word export error:', err);
      triggerToast('Failed to generate Word document: ' + err.message);
    }
  };

  // Copy Live Resume URL
  const copyLiveResumeUrl = () => {
    const liveUrl = window.location.origin + '/candidate/resume/' + (profile?._id || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(liveUrl);
      triggerToast('Live resume URL copied to clipboard!');
    }
  };

  const handleSaveEmployment = async () => {
    if (!employmentForm.companyName || !employmentForm.role || !employmentForm.location || !employmentForm.joiningDate || !employmentForm.ctc) {
      triggerToast('Please fill in all required fields.');
      return;
    }
    setSavingEmployment(true);
    try {
      const res = await api.post('/candidate/employment', employmentForm);
      triggerToast(res.data?.message || 'Employment details saved successfully.');
      setShowAddJobForm(false);
      setEmploymentForm({ companyName: '', role: '', specialty: '', location: '', joiningDate: '', ctc: '', employmentType: 'Full Time · Permanent', uan: '', manager: '', project: '' });
      const resProfile = await api.get('/candidate/profile');
      setProfile(resProfile.data?.candidate || resProfile.data);
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not save employment record.');
    } finally {
      setSavingEmployment(false);
    }
  };

  return (
    <div className="app">
      {/* Toast Notification */}
      {toastMessage && (
        <div id="toast" style={{ display: 'block' }}>
          {toastMessage}
        </div>
      )}

      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand-nav" onClick={() => setActiveTab('dashboard')} title="Talentera Candidate Portal" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#FFFFFF', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
            <img
              src="/logo.png"
              alt="Talentera — The Era of Talent Begins Here"
              style={{ height: '26px', width: 'auto', objectFit: 'contain', display: 'block' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fb = document.getElementById('topbar-brand-fallback');
                if (fb) fb.style.display = 'flex';
              }}
            />
          </div>
          <div id="topbar-brand-fallback" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <div className="brand-logo-sm">T</div>
            <div>
              <div className="brand-name" style={{ color: '#FFFFFF' }}>TALENT<span style={{ color: 'var(--gold)' }}>ERA</span></div>
              <div className="brand-tag" style={{ color: 'var(--gold)' }}>Student &amp; Candidate Portal</div>
            </div>
          </div>
        </div>

        <div className="top-actions">
          {/* ⚡ 8 Stages Verification Dashboard Topbar Action */}
          <button
            type="button"
            onClick={() => handleOpenStagesWizard(1)}
            className="btn-open-stages-topbar"
            title="Open Candidate 8 Stages Verification Wizard"
          >
            <span className="stages-icon-pulse">⚡</span>
            <span>8 Stages Dashboard</span>
            <span className="stages-count-pill">{completedStages.length}/8 Done</span>
          </button>

          <div className="top-search" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="text" placeholder="Search jobs, stages, badges..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '200px', color: '#FFFFFF' }} />
          </div>

          <div className="top-notif" onClick={() => triggerToast("You have no unread notifications.")}>
            🔔
          </div>

          <div className="top-user" onClick={() => setActiveTab('profile')}>
            <div className="user-avatar">{candidateName.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <div className="name">{candidateName}</div>
              <div className="status">
                <span className="status-dot"></span>
                {profileScore >= 75 ? 'Verified Candidate' : `Score: ${profileScore}/100`}
              </div>
            </div>
          </div>

          {/* 🚪 Sign Out Button -> redirects to Homepage */}
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-signout-topbar"
            title="Sign out of Candidate Portal and return to Homepage"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar" ref={sidebarRef}>
          {/* ⚡ Quick Launch 8 Stages Wizard Banner */}
          <div
            className="sb-stage-wizard-banner"
            onClick={() => handleOpenStagesWizard(1)}
            title="Click to open Candidate 8 Stages Verification Dashboard"
          >
            <div className="sb-swb-top">
              <div className="sb-swb-icon-wrap">⚡</div>
              <div className="sb-swb-text">
                <div className="sb-swb-title">8 Stages Dashboard</div>
                <div className="sb-swb-sub">{completedStages.length}/8 Completed · {profileScore} pts</div>
              </div>
            </div>
            <div className="sb-swb-bar">
              <div className="sb-swb-bar-fill" style={{ width: `${Math.round((completedStages.length / 8) * 100)}%` }}></div>
            </div>
            <div className="sb-swb-action">
              <span>{completedStages.length === 8 ? 'Review / Edit 8 Stages' : 'Complete 8 Stages'}</span>
              <span className="sb-swb-arrow">→</span>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">STUDENT DASHBOARD</div>
            <div className="sb-nav">
              <div data-tab="dashboard" className={'sb-item ' + (activeTab === 'dashboard' ? 'active' : '')} onClick={() => setActiveTab('dashboard')}>
                <span className="ico">📊</span>
                <span>My Hub</span>
              </div>
              <div data-tab="profile" className={'sb-item ' + (activeTab === 'profile' ? 'active' : '')} onClick={() => setActiveTab('profile')}>
                <span className="ico">👤</span>
                <span>My Profile</span>
                <span className="badge green">{profileScore}/100</span>
              </div>
              <div data-tab="badges" className={'sb-item ' + (activeTab === 'badges' ? 'active' : '')} onClick={() => setActiveTab('badges')}>
                <span className="ico">🏅</span>
                <span>My Badges</span>
              </div>
              <div data-tab="documents" className={'sb-item ' + (activeTab === 'documents' ? 'active' : '')} onClick={() => setActiveTab('documents')}>
                <span className="ico">📁</span>
                <span>My Documents</span>
              </div>
              <div data-tab="resumes" className={'sb-item ' + (activeTab === 'resumes' ? 'active' : '')} onClick={() => setActiveTab('resumes')}>
                <span className="ico">📄</span>
                <span>My Resumes</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">HIRING &amp; EMPLOYERS</div>
            <div className="sb-nav">
              <div data-tab="companies" className={'sb-item ' + (activeTab === 'companies' ? 'active' : '')} onClick={() => setActiveTab('companies')}>
                <span className="ico">🏢</span>
                <span>My Companies</span>
                <span className="badge gold">{companies.length}</span>
              </div>
              <div data-tab="applications" className={'sb-item ' + (activeTab === 'applications' ? 'active' : '')} onClick={() => setActiveTab('applications')}>
                <span className="ico">📋</span>
                <span>My Applications</span>
                <span className="badge gold">{applications.length}</span>
              </div>
              <div data-tab="invites" className={'sb-item ' + (activeTab === 'invites' ? 'active' : '')} onClick={() => setActiveTab('invites')}>
                <span className="ico">💌</span>
                <span>Interview Invites</span>
              </div>
              <div data-tab="feedback" className={'sb-item ' + (activeTab === 'feedback' ? 'active' : '')} onClick={() => setActiveTab('feedback')}>
                <span className="ico">💬</span>
                <span>Feedback Vault</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">GROW</div>
            <div className="sb-nav">
              <div data-tab="jobs" className={'sb-item ' + (activeTab === 'jobs' ? 'active' : '')} onClick={() => setActiveTab('jobs')}>
                <span className="ico">🔍</span>
                <span>Browse Jobs</span>
                <span className="badge blue">{jobs.length}</span>
              </div>
              <div data-tab="learning" className={'sb-item ' + (activeTab === 'learning' ? 'active' : '')} onClick={() => setActiveTab('learning')}>
                <span className="ico">📚</span>
                <span>Learning Hub</span>
              </div>
              <div data-tab="analytics" className={'sb-item ' + (activeTab === 'analytics' ? 'active' : '')} onClick={() => setActiveTab('analytics')}>
                <span className="ico">📈</span>
                <span>Career Analytics</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">🎁 EARN · 3 ENGINES</div>
            <div className="sb-nav">
              <div data-tab="refer" className={'sb-item ' + (activeTab === 'refer' ? 'active' : '')} onClick={() => setActiveTab('refer')}>
                <span className="ico">🎁</span>
                <span>Refer to Portal</span>
                <span className="badge gold">{(referrals?.pointsWallet ?? profile?.pointsWallet ?? 50)} pts</span>
              </div>
              <div data-tab="employer-referrals" className={'sb-item ' + (activeTab === 'employer-referrals' ? 'active' : '')} onClick={() => setActiveTab('employer-referrals')}>
                <span className="ico">🏢</span>
                <span>Employer Referrals</span>
                <span className="badge blue">Direct pay</span>
              </div>
              <div data-tab="academy-referrals" className={'sb-item ' + (activeTab === 'academy-referrals' ? 'active' : '')} onClick={() => setActiveTab('academy-referrals')}>
                <span className="ico">🏫</span>
                <span>Academy Referrals</span>
                <span className="badge green">
                  {(referrals?.academyReferrals?.filter(r => r.status === 'PAID')?.length || 0) > 0
                    ? `₹${((referrals.academyReferrals.filter(r => r.status === 'PAID').length) * 2500).toLocaleString()}`
                    : '₹0'}
                </span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">VERIFICATION</div>
            <div className="sb-nav">
              <div data-tab="employment" className={'sb-item ' + (activeTab === 'employment' ? 'active' : '')} onClick={() => setActiveTab('employment')}>
                <span className="ico">🛡️</span>
                <span>Employment &amp; BG</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">ACCOUNT</div>
            <div className="sb-nav">
              <div data-tab="settings" className={'sb-item ' + (activeTab === 'settings' ? 'active' : '')} onClick={() => setActiveTab('settings')}>
                <span className="ico">⚙️</span>
                <span>Settings</span>
              </div>
              <div data-tab="help" className={'sb-item ' + (activeTab === 'help' ? 'active' : '')} onClick={() => setActiveTab('help')}>
                <span className="ico">❓</span>
                <span>Help &amp; Support</span>
              </div>
              <div className="sb-item sb-signout-item" onClick={handleSignOut} title="Sign out and return to Homepage">
                <span className="ico">🚪</span>
                <span>Sign Out</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">
          {activeTab === 'dashboard' && (
<div className="page active" id="page-dashboard">
      <div className="welcome-hero">
        <div className="wh-grid">
          <div>
            <div className="wh-greeting">👋 Welcome back</div>
            <div className="wh-name">{candidateName}</div>
            <div className="wh-tagline">{(companiesAttendedCount > 0 || pendingInvites.length > 0) ? `Your Career Passport is live. ${companiesAttendedCount} ${companiesAttendedCount === 1 ? 'company' : 'companies'} tracked · ${pendingInvites.length} pending interview ${pendingInvites.length === 1 ? 'invite' : 'invites'}.` : 'Your Career Passport is live. Stage verification score computed live from Stages 1–8.'}</div>
            <div className="wh-badges">
              <span className={"wh-chip " + (profileScore >= 75 ? 'gold' : '')}>{profileScore >= 75 ? '🏆 Talentera Verified (75+)' : `⏳ Stage Score: ${profileScore}/100`}</span>
              <span className={"wh-chip " + (profile?.stage8?.liveForHiring ? 'green' : '')}>{profile?.stage8?.liveForHiring ? '🟢 LIVE FOR HIRING' : '⚪ Not Live Yet'}</span>
              <span className="wh-chip">🎓 {profile?.stage1?.currentRole || profile?.stage2?.domain || 'Candidate'}</span>
              <span className="wh-chip">📍 {profile?.stage1?.city || 'Location not set'}</span>
            </div>

            {/* ⚡ Prominent Hero Action Buttons to Open 8 Stages Dashboard */}
            <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleOpenStagesWizard(1)}
                className="btn-open-stages-hero"
                title="Launch the Candidate 8 Stages Verification Dashboard"
              >
                <span>⚡ Open 8 Stages Dashboard</span>
                <span className="hero-btn-pill">{completedStages.length}/8 Done</span>
                <span style={{ fontSize: '15px' }}>→</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="btn-view-profile-hero"
                title="View individual stage completion breakdowns"
              >
                👤 View Stage Breakdown
              </button>
            </div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div
              className="stamp-ring"
              style={{
                background: `conic-gradient(var(--gold) 0deg ${profileScore * 3.6}deg, rgba(255,255,255,0.18) ${profileScore * 3.6}deg 360deg)`,
                transition: 'background 0.4s ease'
              }}
            >
              <div className="stamp-inner">
                <div>
                  <div className="stamp-big">{profileScore}</div>
                  <div className="stamp-small">/ 100</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {profileScore >= 75 ? '🏆 Gold Verified' : 'Passport Score'}
            </div>
          </div>
        </div>
      </div>

      <div className="quick-stats">
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico blue">🏢</div><div><div className="qs-val">{companiesAttendedCount}</div><div className="qs-lbl">Companies Attended</div><div className="qs-trend">{applications.length > 0 ? `${applications.length} total applications` : 'No applications yet'}</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico green">✓</div><div><div className="qs-val">{offersReceivedCount}</div><div className="qs-lbl">Offers Received</div><div className="qs-trend">{bestOfferCtc > 0 ? `↑ Best ₹${bestOfferCtc} LPA` : 'No offers yet'}</div></div></div>
        <div className="qs-card" onClick={() => handleOpenStagesWizard(6)}><div className="qs-ico gold">💻</div><div><div className="qs-val">{chartsCoded}</div><div className="qs-lbl">Charts Coded</div><div className="qs-trend">{chartsCoded > 0 ? (profile?.stage6?.tier || 'Logged') : 'Open Stage 06'}</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("badges")}><div className="qs-ico purple">🎖</div><div><div className="qs-val">{badgesEarnedCount}</div><div className="qs-lbl">Badges Earned</div><div className="qs-trend">{badgesEarnedCount > 0 ? `of ${badgeCriteria.length} available` : 'Complete stages to earn'}</div></div></div>
      </div>

      {/* ⚡ Candidate 8 Stages Interactive Verification Grid */}
      <div className="sec">
        <div className="sec-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="sec-title"><div className="mod-ico">⚡</div>Candidate 8 Stages Verification</div>
          <button
            type="button"
            onClick={() => handleOpenStagesWizard(1)}
            style={{
              fontSize: '12px',
              fontWeight: '800',
              color: 'var(--navy-deep)',
              background: 'var(--grad-gold)',
              padding: '6px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(245, 166, 35, 0.35)',
            }}
          >
            <span>Open 8 Stages Wizard</span>
            <span>→</span>
          </button>
        </div>
        <div className="stages-overview-grid">
          {[
            { num: 1, name: 'Identity & Aadhaar', pts: '+5 pts', icon: '🪪', done: completedStages.includes(1) },
            { num: 2, name: 'Training Foundation', pts: '+15 pts', icon: '🎓', done: completedStages.includes(2) },
            { num: 3, name: 'Certifications', pts: '+20 pts', icon: '📜', done: completedStages.includes(3) },
            { num: 4, name: 'Assessment', pts: '+25 pts', icon: '🧠', done: completedStages.includes(4) },
            { num: 5, name: 'Video Pitch AI', pts: '+10 pts', icon: '🎥', done: completedStages.includes(5) },
            { num: 6, name: 'Live Charts Audit', pts: '+10 pts', icon: '💻', done: completedStages.includes(6) },
            { num: 7, name: 'Resume Studio', pts: '+10 pts', icon: '📄', done: completedStages.includes(7) },
            { num: 8, name: 'Placement & Hiring', pts: '+5 pts', icon: '📍', done: completedStages.includes(8) },
          ].map((stg) => (
            <div
              key={stg.num}
              className={"stage-overview-card " + (stg.done ? "done" : "pending")}
              onClick={() => handleOpenStagesWizard(stg.num)}
              title={`Click to open Stage 0${stg.num}: ${stg.name}`}
            >
              <div className="soc-top">
                <span className="soc-badge">0{stg.num}</span>
                <span className="soc-status">{stg.done ? '✓ Done' : 'Pending'}</span>
              </div>
              <div className="soc-icon">{stg.icon}</div>
              <div className="soc-name">{stg.name}</div>
              <div className="soc-pts">{stg.pts}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🎯</div>Priority Actions</div></div>
        <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","borderColor":"var(--gold)"}}>
          {(hiredApplications.length > 0 || pendingInvites.length > 0 || profileScore < 100) ? (
          <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"12px"}}>
            {hiredApplications.length > 0 ? (
              <button onClick={() => setActiveTab("companies")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico green">✉</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Accept {hiredApplications[0].companyName} Offer</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Review your offer details</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("jobs")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico green">✉</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Browse Open Jobs</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>No offers yet — start applying</div></div></button>
            )}
            {pendingInvites.length > 0 ? (
              <button onClick={() => setActiveTab("invites")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico blue">📅</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>{pendingInvites.length} Interview{pendingInvites.length === 1 ? '' : 's'} Pending</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>{pendingInvites[0].company} · {pendingInvites[0].role}</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("invites")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico blue">📅</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>No Interviews Pending</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>You'll see invites here</div></div></button>
            )}
            {profileScore < 100 ? (
              <button onClick={() => handleOpenStagesWizard(1)} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico purple">⚡</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Complete 8 Stages</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>{profileScore}/100 stage score · {8 - completedStages.length} stage{(8 - completedStages.length) === 1 ? '' : 's'} left</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("learning")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico purple">📚</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Keep Learning</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Stage score 100/100 · Fully verified</div></div></button>
            )}
          </div>
          ) : (
            <div style={{"textAlign":"center","padding":"20px","color":"var(--gray-mute)","fontSize":"13px"}}>You're all caught up. No priority actions right now.</div>
          )}
        </div>
      </div>
    </div>
)}

          {activeTab === 'profile' && (
<div className="page active" id="page-profile">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="page-eyebrow">Verified Profile · Auto-updates when you improve any stage</div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-sub">Everything companies see about you — pulled live from your 8 verification stages. Click any stage to edit directly in the 8 stages wizard.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          className="btn-open-stages-hero"
          style={{ background: 'var(--grad-navy-dark)', color: '#FFFFFF', border: '1.5px solid var(--gold)', boxShadow: '0 4px 14px rgba(10, 37, 64, 0.3)' }}
          title="Open Candidate 8 Stages Verification Wizard"
        >
          <span style={{ color: 'var(--gold-lite)' }}>⚡</span>
          <span>Open 8 Stages Dashboard</span>
          <span className="hero-btn-pill">{completedStages.length}/8 Completed</span>
        </button>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{candidateName ? candidateName.split(' ').map((w) => w[0]).slice(0,2).join('').toUpperCase() : 'NA'}</div>
          <div className="profile-avatar-edit" onClick={() => handleOpenStagesWizard(1)} title="Change photo in Stage 1">📷</div>
        </div>
        <div className="profile-info">
          <div className="profile-name">{candidateName}</div>
          <div className="profile-title">{profile?.stage1?.currentRole || profile?.stage2?.domain || 'Candidate'}{profile?.stage3?.certifications?.length ? ` · ${profile.stage3.certifications.map((c) => c.code || c.certCode).filter(Boolean).join(' + ')}` : ''}{profileScore >= 75 ? ' · Talentera Verified' : ''}</div>
          <div className="profile-meta">
            <span className={"wh-chip " + (profile?.stage8?.liveForHiring ? 'green' : '')}>{profile?.stage8?.liveForHiring ? '🟢 LIVE FOR HIRING' : '⚪ Not Live Yet'}</span>
            <span className={"wh-chip " + (profileScore >= 75 ? 'gold' : '')}>🏆 {profileScore}/100 Verified</span>
            <span className="wh-chip">📍 {profile?.stage1?.city || 'Location not set'}</span>
            <span className="wh-chip">🎂 {profile?.stage1?.dob ? new Date(profile.stage1.dob).toLocaleDateString('en-IN') : 'DOB not set'}{profile?.stage1?.gender ? ` · ${profile.stage1.gender}` : ''}</span>
          </div>
        </div>
        <button className="profile-cta" onClick={() => handleOpenStagesWizard(1)}>⚡ Edit All Stages</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 14px' }}>
        <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":0}}>Your 8 Verification Stages</h3>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--navy)', background: 'var(--grad-gold-soft)', border: '1px solid var(--gold)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <span>⚡ Launch 8-Stage Wizard</span>
          <span>→</span>
        </button>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">01</div>
            <div><div className="stage-detail-name">Identity · {completedStages.includes(1) ? 'Aadhaar Verified' : 'Not Completed'}</div><div className="stage-detail-tag">+5 pts · {completedStages.includes(1) ? 'Verified' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(1)}>✎ Edit Stage 01</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Full Name</div><div className="v">{candidateName || '—'}</div></div>
          <div className="field"><div className="k">DOB</div><div className="v">{profile?.stage1?.dob ? `${new Date(profile.stage1.dob).toLocaleDateString('en-IN')} · 🔒` : '—'}</div></div>
          <div className="field"><div className="k">Gender</div><div className="v">{profile?.stage1?.gender ? `${profile.stage1.gender} · 🔒` : '—'}</div></div>
          <div className="field"><div className="k">Mobile</div><div className="v">{candidatePhone ? `${candidatePhone}${profile?.stage1?.aadhaarVerified ? ' ✓' : ''}` : '—'}</div></div>
          <div className="field"><div className="k">Email</div><div className="v">{candidateEmail ? `${candidateEmail} ✓` : '—'}</div></div>
          <div className="field"><div className="k">Locality</div><div className="v">{profile?.stage1?.address || profile?.stage1?.currentLocality || profile?.stage1?.city || '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">02</div>
            <div><div className="stage-detail-name">Foundation · {profile?.stage2?.academyName || profile?.stage2?.instituteName || (completedStages.includes(2) ? 'Completed' : 'Not Completed')}</div><div className="stage-detail-tag">+15 pts · {completedStages.includes(2) ? 'Academy-Signed' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(2)}>✎ Edit Stage 02</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Academy</div><div className="v">{profile?.stage2?.academyName || profile?.stage2?.instituteName || '—'}</div></div>
          <div className="field"><div className="k">Domain</div><div className="v">{profile?.stage2?.domain || '—'}</div></div>
          <div className="field"><div className="k">Level</div><div className="v">{profile?.stage2?.trainingLevel || profile?.stage2?.level || '—'}</div></div>
          <div className="field"><div className="k">Specialties</div><div className="v">{Array.isArray(profile?.stage2?.specialties) ? profile.stage2.specialties.join(' + ') : (profile?.stage2?.specialty || profile?.stage2?.specialties || '—')}</div></div>
          <div className="field"><div className="k">Duration</div><div className="v">{profile?.stage2?.duration || (profile?.stage2?.totalHours ? `${profile.stage2.totalHours} hrs` : '—')}</div></div>
          <div className="field"><div className="k">Score</div><div className="v">{(profile?.stage2?.score ?? profile?.stage2?.assessmentScore) != null ? `${profile?.stage2?.score ?? profile?.stage2?.assessmentScore} / 100` : '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">03</div>
            <div><div className="stage-detail-name">Certifications · {(profile?.stage3?.certifications?.length || (profile?.stage3?.certCode ? 1 : 0))} Active</div><div className="stage-detail-tag">+20 pts · {profile?.stage3?.certStatus === 'verified' ? 'API-Verified' : (completedStages.includes(3) ? 'Pending Verification' : 'Not Completed')}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(3)}>➕ Add / Edit Cert (Stage 03)</button></div>
        </div>
        <div className="stage-fields">
          {(profile?.stage3?.certifications?.length > 0 ? profile.stage3.certifications : (profile?.stage3?.certCode ? [profile.stage3] : [])).map((cert, idx) => (
            <div className="field" key={cert.memberId || cert.certCode || idx}><div className="k">{cert.code || cert.certCode || 'Cert'}</div><div className="v">{(cert.body || cert.issuingBody || 'AAPC')} {cert.memberId ? `****${String(cert.memberId).slice(-4)}` : ''} · {profile?.stage3?.certStatus === 'verified' ? 'Active' : 'Pending'}</div></div>
          ))}
          {!(profile?.stage3?.certifications?.length > 0) && !profile?.stage3?.certCode && (
            <div className="field"><div className="k">Certifications</div><div className="v">No certifications added yet</div></div>
          )}
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">04</div>
            <div><div className="stage-detail-name">Assessment · {(profile?.stage4?.foundationScore ?? profile?.stage4?.score) != null ? `${profile?.stage4?.medal || (profile?.stage4?.passed ? 'Passed' : 'Attempted')} ${profile?.stage4?.foundationScore ?? profile?.stage4?.score}/100` : 'Not Completed'}</div><div className="stage-detail-tag">+25 pts · Talentera-Proctored</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(4)}>🔄 Take Stage 04 Assessment</button></div>
        </div>
        <div className="stage-fields">
          {Array.isArray(profile?.stage4?.sectionScores) && profile.stage4.sectionScores.length > 0 ? profile.stage4.sectionScores.map((sec, idx) => (
            <div className="field" key={sec.sectionKey || idx}><div className="k">{sec.sectionName || sec.sectionKey}</div><div className="v">{sec.score != null ? `${sec.score} / 100` : `${sec.correct}/${sec.total}`}</div></div>
          )) : (
            <div className="field"><div className="k">Assessment</div><div className="v">Not attempted yet</div></div>
          )}
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">05</div>
            <div><div className="stage-detail-name">Video Pitch · {profile?.stage5?.overallScore != null ? `${profile.stage5.overallScore}/100` : (completedStages.includes(5) ? 'Completed' : 'Not Completed')}</div><div className="stage-detail-tag">+10 pts · {profile?.stage5?.verified ? 'Live Verified' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(5)}>🎥 Open Stage 05 Pitch</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Clarity</div><div className="v">{profile?.stage5?.clarityScore != null ? `${profile.stage5.clarityScore} / 100` : '—'}</div></div>
          <div className="field"><div className="k">Fluency</div><div className="v">{profile?.stage5?.fluencyScore != null ? `${profile.stage5.fluencyScore} / 100` : '—'}</div></div>
          <div className="field"><div className="k">Vocab</div><div className="v">{(profile?.stage5?.vocabScore ?? profile?.stage5?.vocabularyScore) != null ? `${profile?.stage5?.vocabScore ?? profile?.stage5?.vocabularyScore} / 100` : '—'}</div></div>
          <div className="field"><div className="k">Confidence</div><div className="v">{profile?.stage5?.confidenceScore != null ? `${profile.stage5.confidenceScore} / 100` : '—'}</div></div>
          <div className="field"><div className="k">Content</div><div className="v">{profile?.stage5?.contentScore != null ? `${profile.stage5.contentScore} / 100` : '—'}</div></div>
          <div className="field"><div className="k">Recorded</div><div className="v">{profile?.stage5?.completedAt ? new Date(profile.stage5.completedAt).toLocaleDateString('en-IN') : '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">06</div>
            <div><div className="stage-detail-name">Live Chart · {profile?.stage6?.totalCharts ? `${profile.stage6.tier || ''} ${profile.stage6.totalCharts} charts` : 'Not Completed'}</div><div className="stage-detail-tag">+10 pts · {profile?.stage6?.totalCharts ? 'API-Verified' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(6)}>💻 Open Stage 06 Charts</button></div>
        </div>
        <div className="stage-fields">
          {Array.isArray(profile?.stage6?.specialtyCharts) && profile.stage6.specialtyCharts.length > 0 ? profile.stage6.specialtyCharts.map((sc, idx) => (
            <div className="field" key={sc.name || idx}><div className="k">{sc.name}</div><div className="v">{sc.count || 0} · {sc.accuracy || 0}%</div></div>
          )) : (
            <div className="field"><div className="k">Charts</div><div className="v">No charts logged yet</div></div>
          )}
          <div className="field"><div className="k">Platform</div><div className="v">{Array.isArray(profile?.stage6?.selectedPlatforms) && profile.stage6.selectedPlatforms.length > 0 ? profile.stage6.selectedPlatforms.join(' + ') : '—'}</div></div>
          <div className="field"><div className="k">Last coded</div><div className="v">{profile?.stage6?.completedAt ? new Date(profile.stage6.completedAt).toLocaleDateString('en-IN') : '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">07</div>
            <div><div className="stage-detail-name">Resume Studio · {completedStages.includes(7) ? 'Resume Built & Verified' : 'Not Completed'}</div><div className="stage-detail-tag">+10 pts · {completedStages.includes(7) ? 'Built' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(7)}>📄 Open Stage 07 Resume</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Objective</div><div className="v">{profile?.stage7?.objective ? `${profile.stage7.objective.slice(0, 50)}...` : 'Not set'}</div></div>
          <div className="field"><div className="k">Core Skills</div><div className="v">{Array.isArray(profile?.stage7?.skills) ? profile.stage7.skills.slice(0, 4).join(', ') : 'Not set'}</div></div>
          <div className="field"><div className="k">Template</div><div className="v">{profile?.stage7?.themeSettings?.template || 'Fresher Modern'}</div></div>
          <div className="field"><div className="k">PDF Export</div><div className="v">Ready in Stage 07</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">08</div>
            <div><div className="stage-detail-name">Placement &amp; Hiring · {profile?.stage8?.liveForHiring ? 'Live For Hiring' : (completedStages.includes(8) ? 'Preferences Configured' : 'Not Completed')}</div><div className="stage-detail-tag">+5 pts · {completedStages.includes(8) ? 'Ready' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(8)}>📍 Open Stage 08 Track</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Status</div><div className="v">{profile?.stage8?.liveForHiring ? '🟢 Live For Hiring' : '⚪ Not Live'}</div></div>
          <div className="field"><div className="k">Employment</div><div className="v">{profile?.stage8?.employmentStatus || 'Actively Looking'}</div></div>
          <div className="field"><div className="k">Work Mode</div><div className="v">{profile?.stage8?.workMode || 'Hybrid / Remote / Onsite'}</div></div>
          <div className="field"><div className="k">Preferred Cities</div><div className="v">{Array.isArray(profile?.stage8?.preferredCities) ? profile.stage8.preferredCities.join(', ') : 'All locations'}</div></div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'badges' && (
<div className="page active" id="page-badges">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="page-eyebrow">Your visual credibility · What companies scan first</div>
          <h1 className="page-title">My Badges</h1>
          <p className="page-sub">Badges are earned automatically as you complete each verification stage — no manual claiming needed.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          className="btn-open-stages-hero"
          style={{ background: 'var(--grad-navy-dark)', color: '#FFFFFF', border: '1.5px solid var(--gold)' }}
          title="Open 8 Stages Wizard to unlock badges"
        >
          <span style={{ color: 'var(--gold-lite)' }}>⚡</span>
          <span>Open 8 Stages Dashboard</span>
        </button>
      </div>

      <div className="badge-section priority-required">
        <div className="badge-sec-title">
          🔴 Verification Badges
          <span className="badge-sec-tag">CORE STAGES</span>
        </div>
        <div className="badge-sec-sub">These come directly from your 8 verification stages and are what companies check first.</div>
        <div className="badge-grid">
          {badgeCriteria.map((b) => (
            <div className={"badge " + (b.earned ? "earned priority" : "locked")} key={b.key}>
              {b.earned && <div className="badge-crown">👑</div>}
              {b.earned && <div className="badge-verified">✓</div>}
              <div className="badge-ico">{b.icon}</div>
              <div className="badge-name">{b.label}</div>
              <div className="badge-sub">{b.earned ? 'Verified' : 'Not completed yet'}</div>
              <span className={"badge-value " + (b.earned ? "" : "locked-tag")}>{b.earned ? 'Earned' : 'Locked'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="badge-section">
        <div className="badge-sec-title">
          📜 Certification Badges
          <span className="badge-sec-tag regular">FROM STAGE 03</span>
        </div>
        <div className="badge-sec-sub">Every certification you've added in Stage 03, shown here automatically.</div>
        <div className="badge-grid">
          {(profile?.stage3?.certifications?.length > 0 ? profile.stage3.certifications : (profile?.stage3?.certCode ? [profile.stage3] : [])).map((cert, idx) => (
            <div className="badge earned" key={cert.memberId || cert.certCode || idx}>
              <div className="badge-verified">✓</div>
              <div className="badge-ico">{cert.code || cert.certCode || 'CERT'}</div>
              <div className="badge-name">{(cert.body || cert.issuingBody || 'AAPC')} {cert.code || cert.certCode}</div>
              <div className="badge-sub">{cert.name || cert.certName || 'Certification'}</div>
              <span className="badge-value regular">{profile?.stage3?.certStatus === 'verified' ? 'Verified' : 'Pending'}</span>
            </div>
          ))}
          {!(profile?.stage3?.certifications?.length > 0) && !profile?.stage3?.certCode && (
            <div className="badge locked" onClick={() => handleOpenStagesWizard(3)} style={{ cursor: 'pointer' }}>
              <div className="badge-ico">📜</div>
              <div className="badge-name">No Certifications Yet</div>
              <div className="badge-sub">Add one in Stage 03</div>
              <span className="badge-value locked-tag">Locked · Click to Add</span>
            </div>
          )}
        </div>
      </div>

      <div className="badge-section">
        <div className="badge-sec-title">
          ✨ Milestone Badges
          <span className="badge-sec-tag achievement">FROM LIVE CHARTS</span>
        </div>
        <div className="badge-sec-sub">Automatic milestones based on your logged live-chart activity.</div>
        <div className="badge-grid">
          <div className={"badge " + (chartsCoded >= 100 ? "earned" : "locked")}>
            {chartsCoded >= 100 && <div className="badge-verified">✓</div>}
            <div className="badge-ico">💯</div>
            <div className="badge-name">100 Charts Club</div>
            <div className="badge-sub">{chartsCoded >= 100 ? `${chartsCoded} charts logged` : `${chartsCoded} / 100 charts logged`}</div>
            <span className={"badge-value " + (chartsCoded >= 100 ? "regular" : "locked-tag")}>{chartsCoded >= 100 ? 'Earned' : 'Locked'}</span>
          </div>
          <div className={"badge " + (chartsCoded >= 500 ? "earned" : "locked")}>
            {chartsCoded >= 500 && <div className="badge-verified">✓</div>}
            <div className="badge-ico">🏔</div>
            <div className="badge-name">500 Charts Club</div>
            <div className="badge-sub">{chartsCoded >= 500 ? `${chartsCoded} charts logged` : `${chartsCoded} / 500 charts logged`}</div>
            <span className={"badge-value " + (chartsCoded >= 500 ? "regular" : "locked-tag")}>{chartsCoded >= 500 ? 'Earned' : 'Locked'}</span>
          </div>
          <div className={"badge " + (profile?.stage5?.regionalLanguage ? "earned" : "locked")}>
            {profile?.stage5?.regionalLanguage && <div className="badge-verified">✓</div>}
            <div className="badge-ico">🌏</div>
            <div className="badge-name">Multilingual</div>
            <div className="badge-sub">{profile?.stage5?.regionalLanguage ? `English + ${profile.stage5.regionalLanguage}` : 'Add a regional-language video in Stage 05'}</div>
            <span className={"badge-value " + (profile?.stage5?.regionalLanguage ? "regular" : "locked-tag")}>{profile?.stage5?.regionalLanguage ? 'Earned' : 'Locked'}</span>
          </div>
          <div className={"badge " + (profile?.stage4?.medal === 'Gold' ? "earned" : "locked")}>
            {profile?.stage4?.medal === 'Gold' && <div className="badge-verified">✓</div>}
            <div className="badge-ico">🥇</div>
            <div className="badge-name">Gold Assessment</div>
            <div className="badge-sub">{profile?.stage4?.medal === 'Gold' ? 'Scored 85+ on the assessment' : 'Score 85+ to unlock'}</div>
            <span className={"badge-value " + (profile?.stage4?.medal === 'Gold' ? "regular" : "locked-tag")}>{profile?.stage4?.medal === 'Gold' ? 'Earned' : 'Locked'}</span>
          </div>
        </div>
      </div>

      {/* ⚡ Unlock remaining badges banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--grad-hero)', color: '#FFFFFF', borderRadius: '16px', marginTop: '24px', border: '1.5px solid rgba(245, 166, 35, 0.45)', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15.5px' }}>🚀 Unlock All 8 Verification Badges</div>
          <div style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>Complete or improve your scores in the candidate 8 stages verification dashboard.</div>
        </div>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          className="btn-open-stages-hero"
        >
          ⚡ Open 8 Stages Dashboard
        </button>
      </div>
    </div>
)}

          {activeTab === 'documents' && (
            <div className="page active" id="page-documents" style={{ padding: 0 }}>
              <CandidateDocumentsSection
                candidate={profile}
                onVaultUpdated={fetchDashboardData}
              />
            </div>
          )}

          {activeTab === 'resumes' && (
            <div className="page active" id="page-resumes" style={{ padding: 0 }}>
              <CandidateResumeSection
                candidate={profile}
                onSaved={(savedData) => {
                  setProfile((prev) => ({
                    ...(prev || {}),
                    stage7: savedData?.stage7 || savedData?.candidate?.stage7 || savedData,
                    ...(savedData?.candidate || {}),
                  }));
                  fetchDashboardData();
                }}
              />
            </div>
          )}

          {activeTab === 'companies' && (
<div className="page active" id="page-companies">
      <div className="page-head">
        <div className="page-eyebrow">Every company · Every interview · Every outcome</div>
        <h1 className="page-title">My Companies</h1>
        <p className="page-sub">{companiesAttendedCount} {companiesAttendedCount === 1 ? 'company' : 'companies'} tracked · {offersReceivedCount} offer{offersReceivedCount === 1 ? '' : 's'} received{bestOfferCtc > 0 ? ` · Best CTC ₹${bestOfferCtc} LPA` : ''}. Only YOU see feedback details — other companies see anonymized aggregate.</p>
      </div>

      <div className="co-pipeline">
        <div className="co-pipe-stage"><div className="count">{applications.length}</div><div className="lbl">Applied</div></div>
        <div className="co-pipe-stage"><div className="count">{applications.filter((a) => a.status === 'shortlisted').length}</div><div className="lbl">Shortlisted</div></div>
        <div className="co-pipe-stage active"><div className="count">{applications.filter((a) => a.status === 'interviewing').length}</div><div className="lbl">Interviewing</div></div>
        <div className="co-pipe-stage selected"><div className="count">{applications.filter((a) => a.status === 'hired').length}</div><div className="lbl">Selected</div></div>
        <div className="co-pipe-stage rejected"><div className="count">{applications.filter((a) => a.status === 'rejected').length}</div><div className="lbl">Rejected</div></div>
      </div>

      <div className="co-list">
        {applications.length > 0 ? applications.map((app) => {
          const statusMap = {
            applied: { cls: 'applied', label: '⚪ Applied', cta: 'View' },
            shortlisted: { cls: 'shortlisted', label: '🟡 Shortlisted', cta: 'Book →' },
            interviewing: { cls: 'interviewed', label: '🔵 Interviewing', cta: 'Prep →' },
            hired: { cls: 'selected', label: '✓ OFFER', cta: 'Accept →' },
            rejected: { cls: 'rejected', label: '✕ Not Selected', cta: 'Feedback' },
          };
          const st = statusMap[app.status] || statusMap.applied;
          const comp = app.compMin && app.compMax ? `₹${app.compMin} – ₹${app.compMax} LPA` : '';
          return (
            <div className="co-row" key={app._id} onClick={() => triggerToast(`Opening ${app.companyName} details`)}>
              <div className="co-logo">{(app.companyName || 'C')[0].toUpperCase()}</div>
              <div className="co-info"><div className="name">{app.companyName} · {app.roleTitle}</div><div className="role">{app.location}{app.workMode ? ` · ${app.workMode}` : ''}{comp ? ` · ${comp}` : ''}</div><div className="timeline">Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}{app.updatedAt && app.updatedAt !== app.createdAt ? ` · Updated ${new Date(app.updatedAt).toLocaleDateString('en-IN')}` : ''}</div></div>
              <div className={"co-status " + st.cls}>{st.label}{app.status === 'hired' && comp ? ` · ${comp}` : ''}</div>
              <button className="co-cta-btn" onClick={(e) => { e.stopPropagation(); triggerToast(`Opening ${app.companyName}`); }}>{st.cta}</button>
            </div>
          );
        }) : (
          <div style={{"padding":"30px","textAlign":"center","color":"var(--gray-mute)"}}>You haven't applied to any companies yet. Browse the <a onClick={() => setActiveTab("jobs")} style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}}>Jobs Board</a> to get started.</div>
        )}
      </div>
    </div>
)}

          {activeTab === 'applications' && (
<div className="page active" id="page-applications">
      <div className="page-head">
        <div className="page-eyebrow">Application timeline</div>
        <h1 className="page-title">My Applications</h1>
        <p className="page-sub">{applications.length > 0 ? `${applications.length} total application${applications.length === 1 ? '' : 's'} submitted or auto-matched.` : "You haven't submitted any applications yet."}</p>
      </div>
      <div className="card">
        <p style={{"color":"var(--gray-txt)","fontSize":"13px"}}>See <a onClick={() => setActiveTab("companies")} style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}}>My Companies →</a> for the full pipeline view with statuses.</p>
      </div>
    </div>
)}

          {activeTab === 'invites' && (
<div className="page active" id="page-invites">
      <div className="page-head">
        <div className="page-eyebrow">Pending interview slots</div>
        <h1 className="page-title">Interview Invites</h1>
        <p className="page-sub">{pendingInvites.length > 0 ? `${pendingInvites.length} pending confirmation${pendingInvites.length === 1 ? '' : 's'}. Confirm as soon as possible to hold your slot.` : 'No pending interview invites right now.'}</p>
      </div>
      <div className="co-list">
        {invites.length > 0 ? invites.map((inv) => (
          <div className="co-row" key={inv.id}>
            <div className="co-logo" style={{"background":inv.logoBg || 'var(--navy)'}}>{inv.logoLetter || (inv.company || 'C')[0]}</div>
            <div className="co-info"><div className="name">{inv.company} · {inv.role}</div><div className="role">{inv.type}{inv.duration ? ` · ${inv.duration}` : ''}</div><div className="timeline">{inv.time}</div></div>
            <div className={"co-status " + (inv.status === 'confirmed' ? 'selected' : 'shortlisted')}>{inv.status === 'confirmed' ? '✓ Confirmed' : '🟡 Pending'}</div>
            {inv.status !== 'confirmed' && <button className="co-cta-btn" onClick={() => triggerToast("Slot confirmed. Calendar invite sent.")}>✓ Confirm</button>}
          </div>
        )) : (
          <div style={{"padding":"30px","textAlign":"center","color":"var(--gray-mute)"}}>No interview invites yet. They'll show up here once a company shortlists you.</div>
        )}
      </div>
    </div>
)}

          {activeTab === 'feedback' && (
<div className="page active" id="page-feedback">
      <div className="page-head">
        <div className="page-eyebrow">Private to you · Never shared with other companies</div>
        <h1 className="page-title">Feedback Vault</h1>
        <p className="page-sub">Written feedback from every company interview. Only YOU see this. Other companies see aggregate signals only.</p>
      </div>
      <div className="card">
        {applications.filter((a) => a.status === 'rejected' || a.status === 'hired').length > 0 ? (
          applications.filter((a) => a.status === 'rejected' || a.status === 'hired').map((app, idx, arr) => (
            <div style={{"marginBottom": idx === arr.length - 1 ? '0' : '14px'}} key={app._id}>
              <b style={{"color":"var(--navy)"}}>{app.companyName} · {app.status === 'hired' ? 'Offer' : 'Not Selected'} · {new Date(app.updatedAt).toLocaleDateString('en-IN')}</b>
              <div style={{"background":"#FAFAF7","borderLeft": app.status === 'hired' ? "3px solid var(--gold)" : "3px solid var(--red)","padding":"10px 14px","borderRadius":"0 8px 8px 0","marginTop":"6px","fontStyle":"italic","color":"var(--gray-txt)","fontSize":"13px"}}>{app.status === 'hired' ? 'Congratulations — you were selected for this role.' : 'No written feedback was shared for this application.'}</div>
            </div>
          ))
        ) : (
          <div style={{"textAlign":"center","color":"var(--gray-mute)","fontSize":"13px","padding":"10px"}}>No feedback yet. Feedback shared by companies during your interviews will appear here.</div>
        )}
      </div>
    </div>
)}

          {activeTab === 'jobs' && (
            <div className="page active" id="page-jobs" style={{ padding: 0 }}>
              <BrowseJobsSection
                candidate={profile}
                applications={applications}
                onApplied={(job) => {
                  fetchDashboardData();
                }}
              />
            </div>
          )}

          {activeTab === 'refer' && (
            <CandidateReferralPortalSection
              candidate={profile}
              referralsData={referrals}
              onRefresh={fetchDashboardData}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'employer-referrals' && (
            <CandidateEmployerReferralsSection
              candidate={profile}
              referralsData={referrals}
              jobs={jobs}
              onRefresh={fetchDashboardData}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'academy-referrals' && (
            <CandidateAcademyReferralsSection
              candidate={profile}
              referralsData={referrals}
              onRefresh={fetchDashboardData}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'employment' && (
<div className="page active" id="page-employment">
      <div className="page-head" style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","flexWrap":"wrap","gap":"16px"}}>
        <div>
          <div className="page-eyebrow">Your lifetime employment record</div>
          <h1 className="page-title">Employment History</h1>
          <p className="page-sub">Add every job you take. Talentera builds a verified career passport that companies trust more than any resume.</p>
        </div>
        <button className="profile-cta" onClick={() => setShowAddJobForm(!showAddJobForm)} id="addJobBtn" style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 24px","fontSize":"14px","borderRadius":"12px","display":"flex","alignItems":"center","gap":"8px"}}>
          <span style={{"fontSize":"20px","lineHeight":"1"}}>➕</span> Add New Employment
        </button>
      </div>

      {showAddJobForm && (
      <div className="add-employment-form" id="addJobForm" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"16px","padding":"28px 30px","marginBottom":"20px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"20px"}}>
          <h2 style={{"fontSize":"18px","fontWeight":"800","color":"var(--navy)","margin":"0","display":"flex","alignItems":"center","gap":"10px"}}>💼 Add Your New Job at a Company</h2>
          <button onClick={() => setShowAddJobForm(!showAddJobForm)} style={{"background":"transparent","color":"var(--gray-mute)","fontSize":"22px","fontWeight":"800","cursor":"pointer","padding":"0 8px"}}>✕</button>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🏢 Company Name *</label>
            <input type="text" value={employmentForm.companyName} onChange={(e) => setEmploymentForm({ ...employmentForm, companyName: e.target.value })} placeholder="e.g. Optum India" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🎯 Your Role / Designation *</label>
            <input type="text" value={employmentForm.role} onChange={(e) => setEmploymentForm({ ...employmentForm, role: e.target.value })} placeholder="e.g. HCC Medical Coder" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🩺 Department / Specialty</label>
            <input type="text" value={employmentForm.specialty} onChange={(e) => setEmploymentForm({ ...employmentForm, specialty: e.target.value })} placeholder="e.g. HCC · Risk Adjustment" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📍 Work Location *</label>
            <input type="text" value={employmentForm.location} onChange={(e) => setEmploymentForm({ ...employmentForm, location: e.target.value })} placeholder="e.g. Hyderabad · Onsite" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📅 Joining Date *</label>
            <input type="date" value={employmentForm.joiningDate} onChange={(e) => setEmploymentForm({ ...employmentForm, joiningDate: e.target.value })} style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>💰 Base CTC (₹ LPA) *</label>
            <input type="text" value={employmentForm.ctc} onChange={(e) => setEmploymentForm({ ...employmentForm, ctc: e.target.value })} placeholder="6.8" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🏢 Employment Type</label>
            <select value={employmentForm.employmentType} onChange={(e) => setEmploymentForm({ ...employmentForm, employmentType: e.target.value })} style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}>
              <option>Full Time · Permanent</option>
              <option>Trainee (6-month contract)</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🆔 UAN Number</label>
            <input type="text" value={employmentForm.uan} onChange={(e) => setEmploymentForm({ ...employmentForm, uan: e.target.value })} placeholder="12-digit UAN" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>👤 Reporting Manager</label>
            <input type="text" value={employmentForm.manager} onChange={(e) => setEmploymentForm({ ...employmentForm, manager: e.target.value })} placeholder="Manager name" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📋 Project / Client</label>
            <input type="text" value={employmentForm.project} onChange={(e) => setEmploymentForm({ ...employmentForm, project: e.target.value })} placeholder="e.g. UnitedHealthcare" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"flex","gap":"10px","marginTop":"20px","justifyContent":"flex-end"}}>
          <button onClick={() => setShowAddJobForm(false)} style={{"background":"transparent","color":"var(--gray-txt)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"700","border":"1.5px solid var(--border)","cursor":"pointer"}}>Cancel</button>
          <button disabled={savingEmployment} onClick={handleSaveEmployment} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 26px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer"}}>{savingEmployment ? 'Saving…' : '✓ Save'}</button>
        </div>
      </div>
      )}

      {profile?.stage8?.currentEmployment ? (
      <div className="card" style={{"background":"linear-gradient(135deg,var(--green-soft),#F5FDF9)","border":"2px solid var(--green)","padding":"22px 26px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","marginBottom":"16px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"16px"}}>
            <div className="co-logo" style={{"width":"64px","height":"64px","borderRadius":"16px","fontSize":"22px"}}>{(profile.stage8.currentEmployment.companyName || 'C')[0].toUpperCase()}</div>
            <div>
              <div style={{"color":"var(--green)","fontSize":"11px","fontWeight":"800","letterSpacing":"1.2px","textTransform":"uppercase"}}>🟢 CURRENT EMPLOYMENT</div>
              <div style={{"fontSize":"20px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>{profile.stage8.currentEmployment.companyName} · {profile.stage8.currentEmployment.role}</div>
              <div style={{"fontSize":"13px","color":"var(--gray-txt)","marginTop":"4px"}}>{profile.stage8.currentEmployment.location}{profile.stage8.currentEmployment.employmentType ? ` · ${profile.stage8.currentEmployment.employmentType}` : ''}{profile.stage8.currentEmployment.project ? ` · ${profile.stage8.currentEmployment.project}` : ''}</div>
            </div>
          </div>
        </div>
        <div style={{"display":"grid","gridTemplateColumns":"repeat(5,1fr)","gap":"10px"}}>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Joining Date</div><div className="v">{profile.stage8.currentEmployment.joiningDate ? new Date(profile.stage8.currentEmployment.joiningDate).toLocaleDateString('en-IN') : '—'}</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Base CTC</div><div className="v">{profile.stage8.currentEmployment.ctc ? `₹${profile.stage8.currentEmployment.ctc} LPA` : '—'}</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Department</div><div className="v">{profile.stage8.currentEmployment.specialty || '—'}</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Manager</div><div className="v">{profile.stage8.currentEmployment.manager || '—'}</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">UAN</div><div className="v">{profile.stage8.currentEmployment.uan || '—'}</div></div>
        </div>
      </div>
      ) : (
      <div className="card" style={{"textAlign":"center","padding":"30px","color":"var(--gray-mute)"}}>No current employment on record. Click "Add New Employment" once you join a company.</div>
      )}

      <div style={{"marginTop":"24px"}}>
        <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":"0 0 14px","display":"flex","alignItems":"center","gap":"10px"}}><div className="mod-ico">📅</div>Your Lifetime Employment History</h3>
        <div style={{"background":"var(--white)","border":"1px solid var(--border)","borderRadius":"14px","padding":"22px 26px"}}>
          {Array.isArray(profile?.stage8?.employmentHistory) && profile.stage8.employmentHistory.length > 0 ? (
          <div style={{"position":"relative","paddingLeft":"28px"}}>
            <div style={{"position":"absolute","left":"12px","top":"14px","bottom":"14px","width":"2px","background":"var(--gold-pale)"}}></div>
            {profile.stage8.employmentHistory.map((job, idx) => (
              <div style={{"position":"relative","padding":"14px 0 18px"}} key={job.id || idx}>
                <div style={{"position":"absolute","left":"-19px","top":"20px","width":"14px","height":"14px","background": job.status === 'active' ? 'var(--green)' : 'var(--gray-mute)',"border":"3px solid var(--white)","borderRadius":"50%"}}></div>
                <div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800","letterSpacing":".4px"}}>{job.joiningDate ? new Date(job.joiningDate).toLocaleDateString('en-IN') : ''} · {job.status === 'active' ? '🟢 ACTIVE' : 'PAST'}</div>
                <div style={{"fontSize":"14px","color":"var(--navy)","fontWeight":"800","marginTop":"3px"}}>{job.companyName} · {job.role}</div>
                <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px"}}>{job.ctc ? `₹${job.ctc} LPA · ` : ''}{job.location}</div>
              </div>
            ))}
          </div>
          ) : (
            <div style={{"textAlign":"center","color":"var(--gray-mute)","padding":"20px"}}>No employment history yet. Every job you add builds your verified career passport.</div>
          )}
        </div>
      </div>
    </div>
)}

          {activeTab === 'learning' && (
<div className="page active" id="page-learning">
      <div className="page-head">
        <div className="page-eyebrow">Videos + Courses + Question Bank + Partner Academies</div>
        <h1 className="page-title">Learning Hub</h1>
        <p className="page-sub">Stage tutorials, an interview question bank, and partner academy enrollment — coming soon.</p>
      </div>
      <div className="placeholder-page">
        <div className="placeholder-ico">📚</div>
        <div className="placeholder-title">Full Learning Hub — Coming Soon</div>
        <div className="placeholder-sub">Interview prep videos, an RCM question bank filterable by specialty, and partner academy enrollment, with recommendations based on your Assessment results.</div>
      </div>
    </div>
)}

          {activeTab === 'analytics' && (
<div className="page active" id="page-analytics">
      <div className="page-head">
        <div className="page-eyebrow">Deep career metrics</div>
        <h1 className="page-title">Career Analytics</h1>
      </div>
      {applications.length > 0 ? (
      <div className="quick-stats">
        <div className="qs-card"><div className="qs-ico blue">🎯</div><div><div className="qs-val">{Math.round((applications.filter((a) => ['shortlisted','interviewing','hired'].includes(a.status)).length / applications.length) * 100)}%</div><div className="qs-lbl">Shortlist Rate</div></div></div>
        <div className="qs-card"><div className="qs-ico green">✓</div><div><div className="qs-val">{applications.filter((a) => ['interviewing','hired'].includes(a.status)).length > 0 ? Math.round((applications.filter((a) => a.status === 'hired').length / applications.filter((a) => ['interviewing','hired'].includes(a.status)).length) * 100) : 0}%</div><div className="qs-lbl">Interview-to-Offer</div></div></div>
        <div className="qs-card"><div className="qs-ico gold">📅</div><div><div className="qs-val">{profile?.createdAt ? Math.floor((Date.now() - new Date(profile.createdAt)) / 86400000) : 0}</div><div className="qs-lbl">Days on Talentera</div></div></div>
        <div className="qs-card"><div className="qs-ico purple">💰</div><div><div className="qs-val">{bestOfferCtc > 0 ? `₹${bestOfferCtc}` : '—'}</div><div className="qs-lbl">Best CTC (LPA)</div></div></div>
      </div>
      ) : (
      <div className="placeholder-page">
        <div className="placeholder-ico">📊</div>
        <div className="placeholder-title">No data yet</div>
        <div className="placeholder-sub">Once you start applying to companies, your career metrics — shortlist rate, interview-to-offer rate, and more — will appear here.</div>
      </div>
      )}
    </div>
)}

          {activeTab === 'settings' && (
<div className="page active" id="page-settings">
      <div className="page-head">
        <div className="page-eyebrow">Account preferences · Privacy · Notifications</div>
        <h1 className="page-title">Settings</h1>
      </div>
      <div className="settings-grid">
        <div className="settings-card">
          <h3 style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","margin":"0 0 12px"}}>Visibility & Hiring</h3>
          <div className="setting-row"><div><div className="setting-label">Profile Live for Hiring</div><div className="setting-desc">Companies can find you</div></div><div className={"toggle " + (profile?.stage8?.liveForHiring ? "on" : "")} onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Available Immediately</div><div className="setting-desc">Show green available badge</div></div><div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Open to Relocation</div><div className="setting-desc">Anywhere in India</div></div><div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">US Night Shift</div><div className="setting-desc">Accept US-facing roles</div></div><div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
        </div>
        <div className="settings-card">
          <h3 style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","margin":"0 0 12px"}}>Notifications</h3>
          <div className="setting-row"><div><div className="setting-label">WhatsApp Alerts</div><div className="setting-desc">New matches + invites</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Email Digest</div><div className="setting-desc">Weekly career summary</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">SMS on Interview</div><div className="setting-desc">Urgent slot reminders</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Learning Reminders</div><div className="setting-desc">Daily practice nudge</div></div><div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
        </div>
        <div className="settings-card">
          <h3 style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","margin":"0 0 12px"}}>Privacy & DPDP</h3>
          <div className="setting-row"><div><div className="setting-label">Data Consent Active</div><div className="setting-desc">DPDP Act compliance</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Anonymize Rejections</div><div className="setting-desc">Hide from other companies</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Request Data Export</div><div className="setting-desc">GDPR-style download</div></div><button className="btn-secondary" onClick={() => triggerToast("Export request submitted")}>Export</button></div>
          <div className="setting-row"><div><div className="setting-label">Delete Account</div><div className="setting-desc">Right to be forgotten</div></div><button className="btn-secondary" style={{"background":"var(--red-soft)","color":"var(--red)","borderColor":"var(--red-soft)"}} onClick={() => triggerToast("Confirmation email sent")}>Delete</button></div>
        </div>
        <div className="settings-card">
          <h3 style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","margin":"0 0 12px"}}>Account</h3>
          <div className="setting-row"><div><div className="setting-label">Email</div><div className="setting-desc">{candidateEmail || 'Not set'}</div></div><button className="btn-secondary" onClick={() => triggerToast("Verification email sent")}>Change</button></div>
          <div className="setting-row"><div><div className="setting-label">Mobile</div><div className="setting-desc">{candidatePhone || 'Not set'}</div></div><button className="btn-secondary" onClick={() => triggerToast("OTP sent to new number")}>Change</button></div>
          <div className="setting-row"><div><div className="setting-label">Password</div><div className="setting-desc">••••••••</div></div><button className="btn-secondary" onClick={() => triggerToast("Password reset email sent")}>Change</button></div>
          <div className="setting-row"><div><div className="setting-label">Two-Factor Auth</div><div className="setting-desc">Extra security</div></div><div className="toggle" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'help' && (
<div className="page active" id="page-help">
      <div className="page-head">
        <div className="page-eyebrow">Get answers · Chat with us · Read guides</div>
        <h1 className="page-title">Help & Support</h1>
      </div>
      <div className="placeholder-page">
        <div className="placeholder-ico">🛟</div>
        <div className="placeholder-title">We're here to help</div>
        <div className="placeholder-sub">Live chat with the Talentera team, an FAQ library, and video tutorials — coming soon. For now, reach out via the contact details on your registration email.</div>
      </div>
    </div>
)}        </main>
      </div>

      {/* REFERRAL MODAL */}
      {referralModal.open && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setReferralModal({ open: false, title: '', sub: '', link: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">{referralModal.title}</div>
                <div className="modal-sub">{referralModal.sub}</div>
              </div>
              <button className="modal-close" onClick={() => setReferralModal({ open: false, title: '', sub: '', link: '' })}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>Share your unique link:</p>
              <input type="text" readOnly value={referralModal.link || referralLink} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px' }} />
              <button className="btn btn-primary" style={{ marginTop: '12px', width: '100%' }} onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(referralModal.link || referralLink);
                  triggerToast('Link copied to clipboard!');
                }
              }}>Copy Link</button>
            </div>
          </div>
        </div>
      )}

      {/* HOW REFERRALS WORK - INFO MODAL (real referral link + point value, generic explainer copy) */}
      {showReferralInfoModal && (
        <div className="modal-overlay show" onClick={() => setShowReferralInfoModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ico-lg">🔗</div>
              <div style={{ flex: 1 }}>
                <div className="title">How Your Referral Works</div>
                <div className="sub">Fully automatic — you just share the link</div>
              </div>
              <button className="close" onClick={() => setShowReferralInfoModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--gray-txt)', lineHeight: '1.6', margin: '0 0 20px' }}>Here's exactly what happens after you share your link. Talentera tracks every step automatically — no manual follow-up needed.</p>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">1</div>
                  <div className="modal-step-title">Your unique referral link is generated ✓</div>
                </div>
                <div className="modal-step-body">Every link is tagged with your Candidate ID, so Talentera knows exactly who to credit when your friend signs up.</div>
                <div className="modal-link-row">
                  <code>{referralLink || 'Loading your link…'}</code>
                  <button onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(referralLink); triggerToast('Link copied to clipboard'); } }}>📋 Copy</button>
                </div>
              </div>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">2</div>
                  <div className="modal-step-title">Share with your friend · Any channel works</div>
                </div>
                <div className="modal-step-body">Send it over WhatsApp, LinkedIn, email, or however you'd normally reach them.</div>
                <div className="modal-share-row">
                  <button className="modal-share-btn" style={{ background: '#25D366' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('WhatsApp share opened'); }}>💬 WhatsApp</button>
                  <button className="modal-share-btn" style={{ background: '#0A66C2' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('LinkedIn share opened'); }}>💼 LinkedIn</button>
                  <button className="modal-share-btn" style={{ background: 'var(--red)' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('Email composer opened'); }}>✉ Email</button>
                  <button className="modal-share-btn" style={{ background: '#0088CC' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('Telegram opened'); }}>📢 Telegram</button>
                </div>
              </div>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">3</div>
                  <div className="modal-step-title">Friend clicks → signs up on Talentera → linked to you</div>
                </div>
                <div className="modal-step-body">They land on the registration page with your referral code pre-filled, verify with Aadhaar OTP like every candidate, and their account is permanently linked to your referral.</div>
              </div>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">4</div>
                  <div className="modal-step-title">+100 points land in your wallet instantly</div>
                </div>
                <div className="modal-step-body">No waiting period — points are credited the moment their signup is verified. Your current balance is <b style={{ color: 'var(--gold-deep)' }}>{referrals?.pointsWallet ?? 0} points</b>.</div>
              </div>

              <div className="modal-outcome">
                <div className="modal-outcome-title">💰 Redeem anytime</div>
                <div className="modal-outcome-row"><span>Current wallet balance</span><span></span><b>{referrals?.pointsWallet ?? 0} pts</b></div>
                <div className="modal-outcome-row"><span>Approx. cash value</span><span></span><b>≈ ₹{Math.round((referrals?.pointsWallet ?? 0) / 2)}</b></div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="hint">🛡 Fair play: points vest once your friend verifies their profile · self-referrals are blocked.</div>
              <button className="cta" onClick={() => { setShowReferralInfoModal(false); if (navigator.clipboard) { navigator.clipboard.writeText(referralLink); triggerToast('Link copied. Ready to share.'); } }}>📋 Copy My Link →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
