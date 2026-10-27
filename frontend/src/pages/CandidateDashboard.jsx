import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import CandidateResumeSection from '../components/CandidateResumeSection.jsx';
import AcademyProfileModal from '../components/AcademyProfileModal.jsx';
import { exportResumeWord } from '../utils/resumeExport.js';
import SupportEnquiries from '../components/SupportEnquiries.jsx';
import CandidateDocumentsSection from '../components/CandidateDocumentsSection.jsx';
import BrowseJobsSection from '../components/BrowseJobsSection.jsx';
import CandidateHiringSection from '../components/CandidateHiringSection.jsx';
import CandidateReferralPortalSection from '../components/CandidateReferralPortalSection.jsx';
import CandidateEmployerReferralsSection from '../components/CandidateEmployerReferralsSection.jsx';
import CandidateAcademyReferralsSection from '../components/CandidateAcademyReferralsSection.jsx';
import CompanyFullDetails from '../components/CompanyFullDetails.jsx';
import { isSelfTrainedCandidate } from '../data/wizardStages';
import './CandidateDashboard.css';

// Points are earned only for what the candidate has actually done - being marked "completed",
// or having chosen a path, is not evidence on its own. Keep these rules in sync with
// backend/utils/verificationScore.js (the server-side source of truth).
// Experienced candidates skip the Stage 4 Assessment; its 20 points move to Certification (Stage 3).
const isExperiencedProfile = (p) => /exp/i.test(String((p && p.stage1 && p.stage1.experience) || ''));
const LIVE_CHART_EXEMPT = ['Medical Billing', 'AR Calling', 'Accounts Receivable', 'Eligibility & Verification'];

function hasRealCertification(s3 = {}) {
  const type = String(s3.certType || s3.status || '').toLowerCase();
  if (s3.nonCertified === true || s3.isCertified === false || s3.certStatus === 'non-certified') return false;
  if (type.includes('non-cert') || type.includes('pursu')) return false;
  if (String(s3.certName || '').toLowerCase().startsWith('pursuing')) return false;
  const code = String(s3.certCode || '').toUpperCase();
  return (Array.isArray(s3.certifications) && s3.certifications.length > 0) || (!!code && code !== 'NON-CERT');
}

function hasStage5Evidence(s5 = {}) {
  const num = (v) => v !== undefined && v !== null && v !== '' && !isNaN(Number(v));
  return !!(
    s5.videoUrl || s5.introVideoUrl || s5.proctoredInterviewVideoUrl || s5.mockInterviewVideoUrl ||
    num(s5.overallScore) || num(s5.aiScore) || num(s5.score) || s5.verified
  );
}

// Per-stage score breakdown for the "Why is my score X?" analytics view: earned/max points per
// stage plus a concrete tip for improving that stage's score.
// Go Live (end of the resume stage) saves stage8.isLive; the settings toggle saves
// stage8.liveForHiring. An explicit toggle value wins, otherwise Go Live counts.
function isProfileLive(profile) {
  const s8 = profile?.stage8 || {};
  if (typeof s8.liveForHiring === "boolean") return s8.liveForHiring;
  return Boolean(s8.isLive || s8.consent || profile?.isSubmitted);
}

export function getScoreBreakdown(profile) {
  if (!profile) profile = {};
  const completedStages = Array.isArray(profile.completedStages) ? profile.completedStages : [];
  const rows = [];

  // Stage 1 - Identity (needs a verified Aadhaar)
  {
    const s1 = profile.stage1 || {};
    const verified = s1.aadhaarVerified === true || s1.aadhaarStatus === 'VERIFIED';
    rows.push({
      num: 1,
      name: 'Identity Verification',
      max: 15,
      earned: verified ? 15 : 0,
      tip: verified ? 'Fully earned — your identity is verified.' : 'Verify your mobile via Aadhaar OTP and fill in your basic identity details in Stage 1 to earn 15 points.',
    });
  }

  // Stage 2 - Foundation
  {
    const s2 = profile.stage2 || {};
    const submitted = completedStages.includes(2) || s2.academyName || s2.instituteName || s2.domain;
    const signedOff = s2.verified === true;
    const expMode = isExperiencedProfile(profile);
    const idVerified = (profile.stage1 || {}).aadhaarVerified === true || (profile.stage1 || {}).aadhaarStatus === 'VERIFIED';
    const earned = expMode ? (idVerified ? 15 : 0) : (submitted ? 15 : 0);
    let tip;
    if (expMode) {
      tip = idVerified
        ? 'Optional for experienced candidates — full 15 points credited. You can still add your work details in Stage 2 for your resume.'
        : 'Optional for experienced candidates — you get the full 15 points as soon as your identity is verified in Stage 1.';
    } else if (submitted) {
      tip = signedOff
        ? 'Earned 15/15 points — your academy has signed off on your training.'
        : 'Earned 15/15 points — Stage 02 Foundation details saved successfully.';
    } else {
      tip = 'Add your academy/institute name, training domain and specialties in Stage 2 to earn up to 15 points.';
    }
    rows.push({ num: 2, name: 'Foundation & Academics', max: 15, earned, tip });
  }

  // Stage 3 - Certification (a real certification only; Non-Certified / Pursuing earn nothing)
  {
    const s3 = profile.stage3 || {};
    const maxPts = isExperiencedProfile(profile) ? 40 : 20;
    const hasCert = hasRealCertification(s3);
    const verified = s3.certStatus === 'verified' || s3.status === 'verified' || s3.verified === true;
    const nonCert = s3.nonCertified === true || s3.certStatus === 'non-certified' || s3.certType === 'non-certified';
    let earned = 0, tip;
    if (hasCert && verified) {
      earned = maxPts;
      tip = 'Fully earned — your certification is verified.';
    } else if (hasCert) {
      earned = isExperiencedProfile(profile) ? Math.round(maxPts * 0.75) : 15;
      tip = `Your certification is on file but still pending verification — get it verified to unlock the remaining ${maxPts - earned} points.`;
    } else if (nonCert) {
      earned = 15;
      tip = `You chose Non-Certified, so this stage gives a fixed ${earned} points. Add a certification (e.g. CPC, CCS, CPB) to earn more` + (maxPts > earned ? ' (up to ' + maxPts + ' points).' : ' and get it verified.');
    } else {
      tip = 'Add at least one certification (e.g. CPC, CCS, CPB) in Stage 3 to earn up to ' + maxPts + ' points.';
    }
    rows.push({ num: 3, name: 'Certifications', max: maxPts, earned, tip });
  }

  // Stage 4 - Domain Assessment (scaled by the actual score). Not required for experienced candidates.
  if (isExperiencedProfile(profile)) {
    rows.push({ num: 4, name: 'Domain Assessment', max: 0, earned: 0, tip: 'Not required for experienced candidates — your score is based on your certifications.' });
  } else {
    const s4 = profile.stage4 || {};
    const raw = s4.foundationScore !== undefined ? s4.foundationScore : s4.score;
    const attempted = raw !== undefined && raw !== null && raw !== '' && !isNaN(Number(raw));
    const fScore = attempted ? Number(raw) : 0;
    let earned = 0, tip;
    if (attempted && (s4.passed === true || fScore >= 70)) {
      earned = 20;
      tip = 'Fully earned — you passed the Stage 4 domain assessment.';
    } else if (attempted && fScore > 0) {
      earned = Math.round((fScore / 100) * 20);
      tip = `You scored ${fScore}/100 on the assessment — retake it and aim for 70+ to unlock the full 20 points.`;
    } else {
      tip = 'Take the Stage 4 domain assessment (proctored) to earn up to 20 points.';
    }
    rows.push({ num: 4, name: 'Domain Assessment', max: 20, earned, tip });
  }

  // Stage 5 - Video Pitch & AI Communication (needs a recorded pitch / AI score)
  {
    const s5 = profile.stage5 || {};
    const done = hasStage5Evidence(s5);
    // Experienced candidates have no mock interview - Stage 5 is scored from the self-intro AI score alone.
    const rawS5 = (isExperiencedProfile(profile) ? [s5.aiScore, s5.overallScore, s5.score] : [s5.overallScore, s5.aiScore, s5.score]).find((v) => v !== undefined && v !== null && v !== '' && !isNaN(Number(v)));
    const hasS5Score = rawS5 !== undefined;
    const s5Pct = hasS5Score ? Math.max(0, Math.min(100, Number(rawS5))) : null;
    const earned5 = !done ? 0 : hasS5Score ? Math.round((s5Pct / 100) * 15) : (s5.verified ? 15 : 8);
    rows.push({
      num: 5,
      name: 'Video Pitch & AI Communication',
      max: 15,
      earned: earned5,
      tip: !done
        ? (isExperiencedProfile(profile) ? 'Record and submit your Stage 5 self-introduction video to earn up to 15 points.' : 'Record and submit your Stage 5 video pitch and AI interview to earn 15 points.')
        : hasS5Score
          ? (earned5 >= 15 ? 'Fully earned — excellent AI communication score.' : `Your AI evaluation score is ${s5Pct}/100, so you earned ${earned5}/15 — redo the self-intro${isExperiencedProfile(profile) ? '' : ' and mock interview'} to improve it.`)
          : 'Your video is on file — the remaining points unlock once the AI evaluation score is available.',
    });
  }

  // Stage 6 - Live Charts (not required for billing / AR style roles)
  {
    const s6 = profile.stage6 || {};
    const s6optForRole = String(s6.evidencePath || s6.option || '').toLowerCase();
    const s6HasEvidence =
      !(s6.skipped || s6optForRole === 'd' || s6optForRole.includes('none') || s6optForRole === 'no_exposure') &&
      ((s6.totalCharts || 0) > 0 || (typeof s6.verificationPoints === 'number' && s6.verificationPoints > 0));
    const selfTrained = isSelfTrainedCandidate(profile);
    const s6Skipped = Boolean(s6.skipped) || s6optForRole === 'd' || s6optForRole.includes('none') || s6optForRole === 'no_exposure';
    if (selfTrained && s6Skipped && !s6HasEvidence && (completedStages.includes(6) || s6.skipped)) {
      rows.push({ num: 6, name: 'Live Charts Audit', max: 20, earned: 15, tip: 'You skipped Live Charts as a non-trained candidate — a fixed 15 points is added. Log charts with evidence in Stage 6 to earn up to 20.' });
    } else if (LIVE_CHART_EXEMPT.includes((profile.stage2 && profile.stage2.domain) || '') && !s6HasEvidence) {
      rows.push({ num: 6, name: 'Live Charts (Bonus)', max: 0, earned: 0, tip: 'Optional for your role — it does not lower your score. Add live chart exposure to earn bonus points.' });
    } else {
      const opt = (s6.evidencePath || s6.option || '').toLowerCase();
      let earned = 0, tip;
      if (s6.skipped || opt === 'd' || opt.includes('none')) {
        tip = 'No live chart evidence logged — add your charts with evidence in Stage 6 to earn up to 20 points.';
      } else if (typeof s6.verificationPoints === 'number') {
        earned = Math.min(20, Math.max(0, Math.round((s6.verificationPoints / 10) * 20)));
        tip = earned >= 20 ? 'Fully earned — your live chart evidence is on file.' : `Your chart evidence earned ${earned}/20 — add more verified charts to raise it.`;
      } else if ((s6.totalCharts || 0) > 0) {
        const selfDeclared = opt === 'c' || opt.includes('self') || opt === 'declare';
        earned = selfDeclared ? 16 : 20;
        tip = selfDeclared
          ? 'Your charts are self-declared (16/20 pts) — switch to API-verified or academy-verified evidence in Stage 6 to unlock the full 20 points.'
          : 'Fully earned — your live chart evidence is on file.';
      } else {
        tip = 'Log your live coding/billing charts with evidence in Stage 6 to earn up to 20 points.';
      }
      rows.push({ num: 6, name: 'Live Charts Audit', max: 20, earned, tip });
    }
  }

  // Stage 7
  {
    const done = completedStages.includes(7) || profile.stage7?.objective || profile.stage7?.skills || profile.manualResume || profile.resumeUrl;
    rows.push({
      num: 7,
      name: 'Resume Studio',
      max: 0,
      earned: 0,
      tip: done ? 'Fully earned — your verified resume is built and ready.' : 'Build your resume in Stage 7 Resume Studio (Output Stage).',
    });
  }

  // Stage 8
  {
    const done = completedStages.includes(8) || profile.stage8?.liveForHiring !== undefined || profile.stage8?.employmentStatus;
    rows.push({
      num: 8,
      name: 'Placement & Live For Hiring',
      max: 0,
      earned: 0,
      tip: done ? 'Fully earned — your placement preferences are configured and live.' : 'Set your placement preferences and go live for hiring in Stage 8 (Output Stage).',
    });
  }

  // The server is the source of truth for points earned per stage - use its numbers so the
  // breakdown always adds up to the score shown on the profile.
  const serverScores = profile.stageScores;
  if (serverScores && typeof serverScores === 'object') {
    rows.forEach((r) => {
      if (r.num <= 6 && r.max > 0) {
        const earned = Math.min(r.max, Math.max(0, Number(serverScores[r.num]) || 0));
        if (earned !== r.earned) {
          r.earned = earned;
          if (/^Fully earned/.test(r.tip) && earned < r.max) r.tip = `Earned ${earned}/${r.max} points so far.`;
        }
      }
    });
  }
  return rows;
}

// Total score = sum of what each stage actually earned. When Live Charts doesn't apply to the
// role, Live Charts is a bonus stage (no rescaling), same as the server.
export function calculateRealStageScore(profile) {
  if (!profile) return 0;
  const rows = getScoreBreakdown(profile);
  const earned = rows.reduce((sum, r) => sum + r.earned, 0);
  return Math.min(100, Math.max(0, Math.round(earned)));
}

export default function CandidateDashboard({ profile: propProfile, onEditStage }) {
  const navigate = useNavigate();
  const [academyTestsPending, setAcademyTestsPending] = useState(0);
  const [showAcademyProfile, setShowAcademyProfile] = useState(false);
  useEffect(() => {
    api
      .get('/candidate/academy-assessments')
      .then((r) => setAcademyTestsPending((r.data.assessments || []).filter((a) => !a.attempt).length))
      .catch(() => {
        /* not linked to an academy - nothing to show */
      });
  }, []);
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [companyDetailApp, setCompanyDetailApp] = useState(null); // application shown in the My Companies detail popup
  const PROFILE_GROUP = ['dashboard', 'profile', 'documents', 'resumes'];
  // Which hiring round the company has this candidate in (from the company's Hiring Rounds pipeline)
  const roundLabel = (app) => {
    const st = app?.hiringSummary?.stage;
    return ({ exam: 'Round 1 · Exam', technical: 'Round 2 · Technical', hr: 'Round 3 · HR', approval: 'Final approval', offered: 'Offer sent', hold: 'On hold' })[st] || '';
  };
  const [respondingOffer, setRespondingOffer] = useState(false);
  const respondToOffer = async (app, accept) => {
    if (respondingOffer) return;
    if (!window.confirm(accept ? `Accept the offer from ${app.companyName}? The company will be notified.` : `Decline the offer from ${app.companyName}?`)) return;
    setRespondingOffer(true);
    try {
      await api.post(`/candidate/hiring/offers/${app._id}/respond`, { accept });
      triggerToast(accept ? `Offer accepted. ${app.companyName} has been notified.` : 'Offer declined. The company has been notified.');
      const resApps = await api.get('/candidate/applications');
      const list = resApps.data?.applications || resApps.data || [];
      setApplications(list);
      setCompanyDetailApp((cur) => (cur ? list.find((x) => x._id === cur._id) || null : cur));
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not send your response.');
    } finally {
      setRespondingOffer(false);
    }
  };
  const COMPANIES_GROUP = ['companies', 'applications', 'invites', 'feedback'];
  const SUBTAB_ICONS = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
    documents: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    resumes: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
    companies: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 9h2a2 2 0 0 1 2 2v10" /><path d="M2 21h20" /><path d="M8 7h4M8 11h4M8 15h4" /></>,
    applications: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 11l2 2 4-4" /><path d="M9 17h6" /></>,
    invites: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
    feedback: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h7M8.5 14.5h4" /></>,
  };
  const renderSubTabs = (items) => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '22px', borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: '16px' }}>
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 26px',
            borderRadius: '999px',
            fontSize: '15.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: activeTab === key ? '1px solid var(--gold)' : '1px solid rgba(15,23,42,0.12)',
            background: activeTab === key ? 'var(--grad-gold)' : 'var(--white)',
            color: 'var(--navy-deep)',
            boxShadow: activeTab === key ? '0 4px 14px rgba(245,166,35,0.35)' : 'none',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{SUBTAB_ICONS[key]}</svg>
          {label}
        </button>
      ))}
    </div>
  );
  const sidebarRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Sign out and redirect to homepage
  const handleSignOut = () => {
    try {
      if (typeof logout === 'function') logout();
    } catch {
      localStorage.removeItem('talentera_token');
      localStorage.removeItem('talentera_candidate_info');
      localStorage.removeItem('talentera_active_stage');
    }
    navigate('/');
  };

  // Helper to open the Candidate 7 Stages Dashboard / Wizard at any specific stage
  const handleOpenStagesWizard = (stageNum = 1) => {
    try {
      localStorage.setItem('talentera_active_stage', String(stageNum));
    } catch (e) {}
    navigate(`/dashboard?stage=${stageNum}`);
    if (typeof onEditStage === 'function') {
      onEditStage(stageNum);
    }
  };
  const [profile, setProfile] = useState(propProfile || null);
  const [loading, setLoading] = useState(!propProfile);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [referralModal, setReferralModal] = useState({ open: false, title: '', sub: '', link: '' });
  const [showReferralInfoModal, setShowReferralInfoModal] = useState(false);
  const [showScoreBreakdownModal, setShowScoreBreakdownModal] = useState(false);
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
  const [confirmingInviteId, setConfirmingInviteId] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [vaultDocs, setVaultDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const confirmInvite = async (inviteId) => {
    if (!inviteId || confirmingInviteId) return;
    setConfirmingInviteId(inviteId);
    try {
      await api.post(`/candidate/invites/${inviteId}/confirm`);
      setInvites((prev) => prev.map((i) => (i.id === inviteId ? { ...i, status: 'confirmed' } : i)));
      triggerToast("Interview slot confirmed. The company has been notified.");
      fetchDashboardData();
    } catch (err) {
      triggerToast(err?.response?.data?.message || "Could not confirm the slot. Please try again.");
    } finally {
      setConfirmingInviteId(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let p = null;
      try {
        const res = await api.get('/candidate/profile');
        if (res.data?.candidate) {
          p = { ...res.data.candidate, score: res.data.score, verificationScore: res.data.score, stageScores: res.data.stageScores };
        } else {
          p = res.data;
        }
      } catch (err) {
        try {
          const resMe = await api.get('/candidate/me');
          if (resMe.data?.candidate) {
            p = { ...resMe.data.candidate, score: resMe.data.score, verificationScore: resMe.data.score, stageScores: resMe.data.stageScores };
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

      try {
        const resNotif = await api.get('/candidate/notifications');
        setNotifications(resNotif.data?.notifications || []);
        setUnreadNotifCount(resNotif.data?.unreadCount || 0);
      } catch (e) { /* notification bell is non-critical - ignore fetch errors */ }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Human-friendly relative time for the notification dropdown ("5m ago", "3h ago", ...)
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const handleToggleNotifDropdown = () => {
    setShowNotifDropdown((prev) => !prev);
  };

  // First time a candidate with a live hiring round (assessment to take, interview to join, offer to answer)
  // opens the portal in a session, land them on Hiring Rounds instead of the generic dashboard.
  const hiringRedirectDone = useRef(false);
  useEffect(() => {
    if (hiringRedirectDone.current) return;
    const actionable = (applications || []).some((a) => ['exam', 'technical', 'hr', 'offered'].includes(a?.hiringSummary?.stage));
    const unreadHiring = (notifications || []).some((n) => !n.read && n.actionType === 'hiring');
    if (!actionable && !unreadHiring) return;
    hiringRedirectDone.current = true;
    let seen = false;
    try { seen = sessionStorage.getItem('tal_hiring_redirect') === '1'; sessionStorage.setItem('tal_hiring_redirect', '1'); } catch (e) { /* storage unavailable - redirect once per page load */ }
    if (!seen) setActiveTab((cur) => (cur === 'dashboard' ? 'hiring' : cur));
  }, [applications, notifications]);

  // Tapping a notification marks it read and opens the page it is about (e.g. an exam -> Hiring Rounds)
  const handleNotifClick = (n) => {
    if (!n.read) {
      api.post('/candidate/notifications/mark-read', { id: n._id }).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadNotifCount((c) => Math.max(0, c - 1));
    }
    const tabFor = { hiring: 'hiring', applications: 'applications', companies: 'companies', invites: 'invites' };
    const tab = tabFor[n.actionType];
    if (tab) { setActiveTab(tab); setShowNotifDropdown(false); }
  };

  const handleMarkAllNotifsRead = async () => {
    if (unreadNotifCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifCount(0);
    try {
      await api.post('/candidate/notifications/mark-read', {});
    } catch (e) { /* local state is already updated optimistically above */ }
  };

  // Close the notification dropdown on any click outside it
  useEffect(() => {
    if (!showNotifDropdown) return;
    const handleOutsideClick = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifDropdown]);

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
  // Stages 1-7 are the core verification wizard; Stage 8 (Placement & Hiring /
  // employment preferences) is a separate, optional step folded into Stage 07's
  // "Go Live" action, so it should not gate or inflate the 7-stage completion count.
  // Stages that don't apply to this candidate (Stage 04 for experienced; Stage 06 when Live Charts
  // isn't required for the role or was skipped / "no exposure") are left out of the "x/y done" counts
  // so they never show as pending.
  const s6Path = String(profile?.stage6?.evidencePath || profile?.stage6?.option || '').toLowerCase();
  // A bonus-domain candidate who actually logged live charts has DONE Stage 6 - it counts as a
  // completed stage (and its points are in the score), it is only "not applicable" when skipped / no charts.
  const s6LoggedCharts =
    !profile?.stage6?.skipped &&
    !(s6Path === 'd' || s6Path.includes('none') || s6Path === 'no_exposure') &&
    ((profile?.stage6?.totalCharts || 0) > 0 || (typeof profile?.stage6?.verificationPoints === 'number' && profile.stage6.verificationPoints > 0));
  const stage6NotApplicable =
    !s6LoggedCharts && (
      LIVE_CHART_EXEMPT.includes((profile?.stage2 && profile.stage2.domain) || '') ||
      Boolean(profile?.stage6?.skipped) ||
      ((s6Path === 'd' || s6Path.includes('none') || s6Path === 'no_exposure') && !((profile?.stage6?.totalCharts || 0) > 0))
    );
  const removedStageNums = new Set();
  if (isExperiencedProfile(profile)) removedStageNums.add(4);
  if (stage6NotApplicable) removedStageNums.add(6);
  const totalStageCount = 7 - removedStageNums.size;
  const wizardStageTotal = 7 - (isExperiencedProfile(profile) ? 1 : 0); // stages shown in the wizard sidebar
  const coreStagesCompleted = completedStages.filter((n) => n <= 7 && !removedStageNums.has(n)).length;
  const stagesLeft = Math.max(0, totalStageCount - coreStagesCompleted);
  const candidateName = profile?.stage1?.fullName || profile?.stage1?.fullname || profile?.fullname || (profile?.email ? profile.email.split('@')[0] : 'Candidate');
  const candidateEmail = profile?.email || '';
  const candidatePhone = profile?.stage1?.mobile || profile?.mobile || '';
  // Real dynamic verification score computed from previous stages
  const profileScore = profile?.score ?? profile?.verificationScore ?? calculateRealStageScore(profile);
  const profileCompleteness = Math.min(100, Math.round((coreStagesCompleted / totalStageCount) * 100));
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
    { key: 'aadhaar', label: 'Aadhaar Identity Verified', icon: <i className="fa-solid fa-id-card" />, earned: !!profile?.stage1?.aadhaarVerified },
    { key: 'academy', label: 'Academy Foundation Complete', icon: <i className="fa-solid fa-graduation-cap" />, earned: completedStages.includes(2) },
    { key: 'cert', label: 'Certification Verified', icon: <i className="fa-solid fa-certificate" />, earned: profile?.stage3?.certStatus === 'verified' },
    { key: 'assessment', label: 'Assessment Passed', icon: <i className="fa-solid fa-brain" />, earned: !!(profile?.stage4?.passed) },
    { key: 'video', label: 'Video Pitch Verified', icon: <i className="fa-solid fa-video" />, earned: !!(profile?.stage5?.verified) },
    { key: 'charts', label: 'Live Charts Logged', icon: <i className="fa-solid fa-laptop" />, earned: (profile?.stage6?.totalCharts || 0) > 0 },
    { key: 'resume', label: 'Resume Built', icon: <i className="fa-solid fa-file-lines" />, earned: completedStages.includes(7) },
    { key: 'track', label: 'Employment Status Set', icon: <i className="fa-solid fa-location-dot" />, earned: completedStages.includes(8) },
  ];
  const visibleBadgeCriteria = badgeCriteria.filter((b) => !(b.key === 'assessment' && isExperiencedProfile(profile)));
  const badgesEarnedCount = visibleBadgeCriteria.filter((b) => b.earned).length;

  const appliedJobIds = new Set(applications.map((a) => a.jobId));
  // Keep My Companies / Applications / Offers in step with what happened in Hiring Rounds or on the company side
  const refreshApplications = useCallback(async () => {
    try {
      const r = await api.get('/candidate/applications');
      const list = r.data?.applications || r.data || [];
      setApplications(list);
      setCompanyDetailApp((cur) => (cur ? list.find((x) => x._id === cur._id) || cur : cur));
    } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => {
    if (['companies', 'applications', 'invites', 'feedback', 'hiring', 'dashboard'].includes(activeTab)) refreshApplications();
  }, [activeTab, refreshApplications]);

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
      {showAcademyProfile && profile?.stage2?.academyId && (
        <AcademyProfileModal academyId={profile.stage2.academyId} onClose={() => setShowAcademyProfile(false)} />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div id="toast" className="toast show">
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
          {/* 7 Stages Verification Dashboard Topbar Action */}
          <button
            type="button"
            onClick={() => handleOpenStagesWizard(1)}
            className="btn-open-stages-topbar"
            title="Open Candidate 7 Stages Verification Wizard"
          >
            <span className="stages-icon-pulse"><i className="fa-solid fa-bolt" /></span>
            <span>{wizardStageTotal} Stages Dashboard</span>
            <span className="stages-count-pill">{coreStagesCompleted}/{totalStageCount} Done</span>
          </button>

          {academyTestsPending > 0 && (
            <button
              type="button"
              onClick={() => navigate('/academy-assessment')}
              className="btn-open-stages-topbar"
              title="Your academy has published an assessment for you"
            >
              <span className="stages-icon-pulse"><i className="fa-solid fa-file-pen" /></span>
              <span>Academy Assessment</span>
              <span className="stages-count-pill">{academyTestsPending} new</span>
            </button>
          )}

          <div className="top-search" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="text" placeholder="Search jobs, stages, badges..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '200px', color: '#FFFFFF' }} />
          </div>

          <div className="top-notif-wrap" ref={notifDropdownRef}>
            <div className="top-notif" onClick={handleToggleNotifDropdown}>
              <i className="fa-solid fa-bell" />
              {unreadNotifCount > 0 && (
                <span className="top-notif-badge">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>
              )}
            </div>

            {showNotifDropdown && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <span>Notifications</span>
                  {unreadNotifCount > 0 && (
                    <button type="button" className="notif-mark-all-btn" onClick={handleMarkAllNotifsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="notif-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">You have no notifications yet.</div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => handleNotifClick(n)} style={n.actionType ? { cursor: 'pointer' } : undefined}>
                        <div className="notif-item-top">
                          <span className="notif-item-title">{n.title}</span>
                          <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
                        </div>
                        <div className="notif-item-message">{n.message}</div>
                        {n.senderName && <div className="notif-item-sender">{n.senderName}</div>}
                        {n.actionType === 'hiring' && <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold-deep)', marginTop: 4 }}>{n.actionLabel || 'Open Hiring Rounds'} →</div>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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

          {/* Sign Out Button -> redirects to Homepage */}
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
          {/* Quick Launch 7 Stages Wizard Banner */}
          <div
            className="sb-stage-wizard-banner"
            onClick={() => handleOpenStagesWizard(1)}
            title="Click to open Candidate 7 Stages Verification Dashboard"
          >
            <div className="sb-swb-top">
              <div className="sb-swb-icon-wrap"><i className="fa-solid fa-bolt" /></div>
              <div className="sb-swb-text">
                <div className="sb-swb-title">{wizardStageTotal} Stages Dashboard</div>
                <div className="sb-swb-sub">{coreStagesCompleted}/{totalStageCount} Completed · {profileScore} pts</div>
              </div>
            </div>
            <div className="sb-swb-bar">
              <div className="sb-swb-bar-fill" style={{ width: `${Math.round((coreStagesCompleted / totalStageCount) * 100)}%` }}></div>
            </div>
            <div className="sb-swb-action">
              <span>{stagesLeft === 0 ? `Review / Edit ${totalStageCount} Stages` : `Complete ${totalStageCount} Stages`}</span>
              <span className="sb-swb-arrow">→</span>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">STUDENT DASHBOARD</div>
            <div className="sb-nav">
              <div data-tab="profile" className={'sb-item ' + (PROFILE_GROUP.includes(activeTab) ? 'active' : '')} onClick={() => { if (!PROFILE_GROUP.includes(activeTab)) setActiveTab('dashboard'); }}>
                <span className="ico"><i className="fa-solid fa-user" /></span>
                <span>My Profile</span>
                <span className="badge green">{profileScore}/100</span>
              </div>
              <div data-tab="badges" className={'sb-item ' + (activeTab === 'badges' ? 'active' : '')} onClick={() => setActiveTab('badges')}>
                <span className="ico"><i className="fa-solid fa-award" /></span>
                <span>My Badges</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">HIRING &amp; EMPLOYERS</div>
            <div className="sb-nav">
              <div data-tab="companies" className={'sb-item ' + (COMPANIES_GROUP.includes(activeTab) ? 'active' : '')} onClick={() => { if (!COMPANIES_GROUP.includes(activeTab)) setActiveTab('companies'); }}>
                <span className="ico"><i className="fa-solid fa-building" /></span>
                <span>My Companies</span>
                <span className="badge gold">{companiesAttendedCount}</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">GROW</div>
            <div className="sb-nav">
              <div data-tab="jobs" className={'sb-item ' + (activeTab === 'jobs' ? 'active' : '')} onClick={() => setActiveTab('jobs')}>
                <span className="ico"><i className="fa-solid fa-magnifying-glass" /></span>
                <span>Browse Jobs</span>
                <span className="badge blue">{jobs.length}</span>
              </div>
              <div data-tab="hiring" className={'sb-item ' + (activeTab === 'hiring' ? 'active' : '')} onClick={() => setActiveTab('hiring')}>
                <span className="ico"><i className="fa-solid fa-list-check" /></span>
                <span>Hiring Rounds</span>
              </div>
              <div data-tab="learning" className={'sb-item ' + (activeTab === 'learning' ? 'active' : '')} onClick={() => setActiveTab('learning')}>
                <span className="ico"><i className="fa-solid fa-book" /></span>
                <span>Learning Hub</span>
              </div>
              <div data-tab="companydetails" className={'sb-item ' + (activeTab === 'companydetails' ? 'active' : '')} onClick={() => setActiveTab('companydetails')}>
                <span className="ico"><i className="fa-solid fa-building" /></span>
                <span>Company Full Details</span>
              </div>
              <div data-tab="analytics" className={'sb-item ' + (activeTab === 'analytics' ? 'active' : '')} onClick={() => setActiveTab('analytics')}>
                <span className="ico"><i className="fa-solid fa-chart-line" /></span>
                <span>Career Analytics</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label"><i className="fa-solid fa-gift" style={{ marginRight: 6 }} />EARN · 3 ENGINES</div>
            <div className="sb-nav">
              <div data-tab="refer" className={'sb-item ' + (activeTab === 'refer' ? 'active' : '')} onClick={() => setActiveTab('refer')}>
                <span className="ico"><i className="fa-solid fa-gift" /></span>
                <span>Refer to Portal</span>
                <span className="badge gold">{(referrals?.pointsWallet ?? profile?.pointsWallet ?? 50)} pts</span>
              </div>
              <div data-tab="employer-referrals" className={'sb-item ' + (activeTab === 'employer-referrals' ? 'active' : '')} onClick={() => setActiveTab('employer-referrals')}>
                <span className="ico"><i className="fa-solid fa-building" /></span>
                <span>Employer Referrals</span>
                <span className="badge blue">Direct pay</span>
              </div>
              <div data-tab="academy-referrals" className={'sb-item ' + (activeTab === 'academy-referrals' ? 'active' : '')} onClick={() => setActiveTab('academy-referrals')}>
                <span className="ico"><i className="fa-solid fa-school" /></span>
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
                <span className="ico"><i className="fa-solid fa-shield-halved" /></span>
                <span>Employment &amp; BG</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">ACCOUNT</div>
            <div className="sb-nav">
              <div data-tab="settings" className={'sb-item ' + (activeTab === 'settings' ? 'active' : '')} onClick={() => setActiveTab('settings')}>
                <span className="ico"><i className="fa-solid fa-gear" /></span>
                <span>Settings</span>
              </div>
              <div data-tab="help" className={'sb-item ' + (activeTab === 'help' ? 'active' : '')} onClick={() => setActiveTab('help')}>
                <span className="ico"><i className="fa-solid fa-circle-question" /></span>
                <span>Help &amp; Support</span>
              </div>
              <div className="sb-item sb-signout-item" onClick={handleSignOut} title="Sign out and return to Homepage">
                <span className="ico"><i className="fa-solid fa-right-from-bracket" /></span>
                <span>Sign Out</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main">
          {PROFILE_GROUP.includes(activeTab) && renderSubTabs([['dashboard', 'My Hub'], ['profile', 'My Profile'], ['documents', 'My Documents'], ['resumes', 'My Resumes']])}
          {COMPANIES_GROUP.includes(activeTab) && renderSubTabs([['companies', 'My Companies'], ['applications', 'My Applications'], ['invites', 'Interview Invites'], ['feedback', 'Feedback Vault']])}
          {activeTab === 'dashboard' && (
<div className="page active" id="page-dashboard">
      <div className="welcome-hero">
        <div className="wh-grid">
          <div>
            <div className="wh-greeting">Welcome back</div>
            <div className="wh-name">{candidateName}</div>
            <div className="wh-tagline">{(companiesAttendedCount > 0 || pendingInvites.length > 0) ? `Your Career Passport is live. ${companiesAttendedCount} ${companiesAttendedCount === 1 ? 'company' : 'companies'} tracked · ${pendingInvites.length} pending interview ${pendingInvites.length === 1 ? 'invite' : 'invites'}.` : 'Your Career Passport is live. Stage verification score computed live from Stages 1–8.'}</div>
            <div className="wh-badges">
              <span className={"wh-chip " + (profileScore >= 75 ? 'gold' : '')}>{profileScore >= 75 ? 'Talentera Verified (75+)' : `Stage Score: ${profileScore}/100`}</span>
              <span className={"wh-chip " + (isProfileLive(profile) ? 'green' : '')}>{isProfileLive(profile) ? 'LIVE FOR HIRING' : 'Not Live Yet'}</span>
              <span className="wh-chip"><i className="fa-solid fa-graduation-cap" style={{ marginRight: 5 }} />{profile?.stage1?.currentRole || profile?.stage2?.domain || 'Candidate'}</span>
              <span className="wh-chip"><i className="fa-solid fa-location-dot" style={{ marginRight: 5 }} />{profile?.stage1?.city || 'Location not set'}</span>
            </div>

            {/* Prominent Hero Action Buttons to Open {wizardStageTotal} Stages Dashboard */}
            <div style={{ marginTop: '18px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleOpenStagesWizard(1)}
                className="btn-open-stages-hero"
                title="Launch the Candidate 7 Stages Verification Dashboard"
              >
                <span><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />Open {wizardStageTotal} Stages Dashboard</span>
                <span className="hero-btn-pill">{coreStagesCompleted}/{totalStageCount} Done</span>
                <span style={{ fontSize: '15px' }}>→</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="btn-view-profile-hero"
                title="View individual stage completion breakdowns"
              >
                <><i className="fa-solid fa-user" style={{ marginRight: 6 }} />View Stage Breakdown</>
              </button>
            </div>
          </div>
          <div
            style={{ textAlign: 'center', cursor: 'pointer' }}
            onClick={() => setShowScoreBreakdownModal(true)}
            title="Click to see how your score is calculated and how to improve it"
          >
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
              {profileScore >= 75 ? 'Gold Verified' : 'Passport Score'}
            </div>
            <div style={{ marginTop: '6px', fontSize: '10.5px', fontWeight: 700, color: 'var(--gold-lite)' }}>
              <i className="fa-solid fa-chart-simple" style={{ marginRight: 5 }} />View score breakdown
            </div>
          </div>
        </div>
      </div>

      <div className="quick-stats">
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico blue"><i className="fa-solid fa-building" /></div><div><div className="qs-val">{companiesAttendedCount}</div><div className="qs-lbl">Companies Attended</div><div className="qs-trend">{applications.length > 0 ? `${applications.length} total applications` : 'No applications yet'}</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico green"><i className="fa-solid fa-check" /></div><div><div className="qs-val">{offersReceivedCount}</div><div className="qs-lbl">Offers Received</div><div className="qs-trend">{bestOfferCtc > 0 ? `↑ Best ₹${bestOfferCtc} LPA` : 'No offers yet'}</div></div></div>
        {!(stage6NotApplicable && chartsCoded === 0) && <div className="qs-card" onClick={() => handleOpenStagesWizard(6)}><div className="qs-ico gold"><i className="fa-solid fa-laptop" /></div><div><div className="qs-val">{chartsCoded}</div><div className="qs-lbl">Charts Coded</div><div className="qs-trend">{chartsCoded > 0 ? (profile?.stage6?.tier || 'Logged') : 'Open Stage 06'}</div></div></div>}
        <div className="qs-card" onClick={() => setActiveTab("badges")}><div className="qs-ico purple"><i className="fa-solid fa-award" /></div><div><div className="qs-val">{badgesEarnedCount}</div><div className="qs-lbl">Badges Earned</div><div className="qs-trend">{badgesEarnedCount > 0 ? `of ${visibleBadgeCriteria.length} available` : 'Complete stages to earn'}</div></div></div>
      </div>

      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico"><i className="fa-solid fa-bullseye" /></div>Priority Actions</div></div>
        <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","borderColor":"var(--gold)"}}>
          {(hiredApplications.length > 0 || pendingInvites.length > 0 || stagesLeft > 0 || profileScore < 100) ? (
          <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"12px"}}>
            {hiredApplications.length > 0 ? (
              <button onClick={() => setActiveTab("companies")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico green"><i className="fa-solid fa-envelope" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Accept {hiredApplications[0].companyName} Offer</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Review your offer details</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("jobs")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico green"><i className="fa-solid fa-envelope" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Browse Open Jobs</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>No offers yet — start applying</div></div></button>
            )}
            {pendingInvites.length > 0 ? (
              <button onClick={() => setActiveTab("invites")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico blue"><i className="fa-solid fa-calendar-days" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>{pendingInvites.length} Interview{pendingInvites.length === 1 ? '' : 's'} Pending</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>{pendingInvites[0].company} · {pendingInvites[0].role}</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("invites")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico blue"><i className="fa-solid fa-calendar-days" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>No Interviews Pending</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>You'll see invites here</div></div></button>
            )}
            {stagesLeft > 0 ? (
              <button onClick={() => handleOpenStagesWizard(1)} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico purple"><i className="fa-solid fa-bolt" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Complete {totalStageCount} Stages</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>{profileScore}/100 stage score · {stagesLeft} stage{stagesLeft === 1 ? '' : 's'} left</div></div></button>
            ) : (
              <button onClick={() => setActiveTab("learning")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico purple"><i className="fa-solid fa-book" /></div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Keep Learning</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Stage score 100/100 · Fully verified</div></div></button>
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
          <p className="page-sub">Everything companies see about you — pulled live from your 7 verification stages. Click any stage to edit directly in the 7 stages wizard.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          className="btn-open-stages-hero"
          style={{ background: 'var(--grad-navy-dark)', color: '#FFFFFF', border: '1.5px solid var(--gold)', boxShadow: '0 4px 14px rgba(10, 37, 64, 0.3)' }}
          title="Open Candidate 7 Stages Verification Wizard"
        >
          <span style={{ color: 'var(--gold-lite)' }}><i className="fa-solid fa-bolt" /></span>
          <span>Open {wizardStageTotal} Stages Dashboard</span>
          <span className="hero-btn-pill">{coreStagesCompleted}/{totalStageCount} Completed</span>
        </button>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{candidateName ? candidateName.split(' ').map((w) => w[0]).slice(0,2).join('').toUpperCase() : 'NA'}</div>
          <div className="profile-avatar-edit" onClick={() => handleOpenStagesWizard(1)} title="Change photo in Stage 1"><i className="fa-solid fa-camera" /></div>
        </div>
        <div className="profile-info">
          <div className="profile-name">{candidateName}</div>
          <div className="profile-title">{profile?.stage1?.currentRole || profile?.stage2?.domain || 'Candidate'}{profile?.stage3?.certifications?.length ? ` · ${profile.stage3.certifications.map((c) => c.code || c.certCode).filter(Boolean).join(' + ')}` : ''}{profileScore >= 75 ? ' · Talentera Verified' : ''}</div>
          <div className="profile-meta">
            <span className={"wh-chip " + (isProfileLive(profile) ? 'green' : '')}>{isProfileLive(profile) ? 'LIVE FOR HIRING' : 'Not Live Yet'}</span>
            <span className={"wh-chip " + (profileScore >= 75 ? 'gold' : '')}><><i className="fa-solid fa-trophy" style={{ color: "#E5A82E", marginRight: 5 }} /> {profileScore}/100 Verified</></span>
            <span className="wh-chip"><i className="fa-solid fa-location-dot" style={{ marginRight: 5 }} />{profile?.stage1?.city || 'Location not set'}</span>
            <span className="wh-chip"><i className="fa-solid fa-cake-candles" style={{ marginRight: 5 }} />{profile?.stage1?.dob ? new Date(profile.stage1.dob).toLocaleDateString('en-IN') : 'DOB not set'}{profile?.stage1?.gender ? ` · ${profile.stage1.gender}` : ''}</span>
          </div>
        </div>
        <button className="profile-cta" onClick={() => handleOpenStagesWizard(1)}><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />Edit All Stages</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 14px' }}>
        <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":0}}>Your 8 Verification Stages</h3>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--navy)', background: 'var(--grad-gold-soft)', border: '1px solid var(--gold)', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
        >
          <span><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />Launch 7-Stage Wizard</span>
          <span>→</span>
        </button>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">01</div>
            <div><div className="stage-detail-name">Identity · {completedStages.includes(1) ? 'Aadhaar Verified' : 'Not Completed'}</div><div className="stage-detail-tag">+15 pts · {completedStages.includes(1) ? 'Verified' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(1)}><><i className="fa-solid fa-pen" style={{ marginRight: 6 }} />Edit Stage 01</></button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Full Name</div><div className="v">{candidateName || '—'}</div></div>
          <div className="field"><div className="k">DOB</div><div className="v">{profile?.stage1?.dob ? `${new Date(profile.stage1.dob).toLocaleDateString('en-IN')} ` : '—'}</div></div>
          <div className="field"><div className="k">Gender</div><div className="v">{profile?.stage1?.gender ? `${profile.stage1.gender} ` : '—'}</div></div>
          <div className="field"><div className="k">Mobile</div><div className="v">{candidatePhone ? `${candidatePhone}${profile?.stage1?.aadhaarVerified ? '' : ''}` : '—'}</div></div>
          <div className="field"><div className="k">Email</div><div className="v">{candidateEmail || '—'}</div></div>
          <div className="field"><div className="k">Locality</div><div className="v">{profile?.stage1?.address || profile?.stage1?.currentLocality || profile?.stage1?.city || '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">02</div>
            <div><div className="stage-detail-name">Foundation · {profile?.stage2?.academyName || profile?.stage2?.instituteName || (completedStages.includes(2) ? 'Completed' : 'Not Completed')}</div><div className="stage-detail-tag">+{profile?.stageScores?.[2] ?? 15} pts · {completedStages.includes(2) ? (profile?.stage2?.verified === true ? 'Academy-Signed' : 'Verified') : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(2)}><><i className="fa-solid fa-pen" style={{ marginRight: 6 }} />Edit Stage 02</></button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Academy</div><div className="v">{profile?.stage2?.academyName || profile?.stage2?.instituteName || '—'}{profile?.stage2?.academyId && (<button type="button" onClick={() => setShowAcademyProfile(true)} style={{ marginLeft: 8, border: 'none', background: 'none', color: '#2563EB', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>View academy profile</button>)}</div></div>
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
            <div><div className="stage-detail-name">Certifications · {(profile?.stage3?.certifications?.length || (profile?.stage3?.certCode ? 1 : 0))} Active</div><div className="stage-detail-tag">+{profile?.stageScores?.[3] ?? 15} pts of {isExperiencedProfile(profile) ? 40 : 20} · {profile?.stage3?.certStatus === 'verified' ? 'API-Verified' : (completedStages.includes(3) ? 'Pending Verification' : 'Not Completed')}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(3)}><><i className="fa-solid fa-plus" style={{ marginRight: 6 }} />Add / Edit Cert (Stage 03)</></button></div>
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

      {!isExperiencedProfile(profile) && (
      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">04</div>
            <div><div className="stage-detail-name">Assessment · {(profile?.stage4?.foundationScore ?? profile?.stage4?.score) != null ? `${(profile?.stage4?.medal && !String(profile.stage4.medal).toLowerCase().includes("practice")) ? profile.stage4.medal : (profile?.stage4?.passed ? 'Passed' : 'Attempted')} ${profile?.stage4?.foundationScore ?? profile?.stage4?.score}/100` : 'Not Completed'}</div><div className="stage-detail-tag">+20 pts · Talentera-Proctored</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(4)}><><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} />Take Stage 04 Assessment</></button></div>
        </div>
        <div className="stage-fields">
          {Array.isArray(profile?.stage4?.sectionScores) && profile.stage4.sectionScores.length > 0 ? profile.stage4.sectionScores.map((sec, idx) => (
            <div className="field" key={sec.sectionKey || idx}><div className="k">{sec.sectionName || sec.sectionKey}</div><div className="v">{sec.score != null ? `${sec.score} / 100` : `${sec.correct}/${sec.total}`}</div></div>
          )) : (
            <div className="field"><div className="k">Assessment</div><div className="v">Not attempted yet</div></div>
          )}
        </div>
      </div>
      )}

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">05</div>
            <div><div className="stage-detail-name">Video Pitch · {profile?.stage5?.overallScore != null ? `${profile.stage5.overallScore}/100` : (completedStages.includes(5) ? 'Completed' : 'Not Completed')}</div><div className="stage-detail-tag">+15 pts · {profile?.stage5?.verified ? 'Live Verified' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(5)}><><i className="fa-solid fa-video" style={{ marginRight: 6 }} />Open Stage 05 Pitch</></button></div>
        </div>
        <div className="stage-fields">
          {[
            ["Clarity", profile?.stage5?.clarityScore ?? profile?.stage5?.rubric?.clarity],
            ["Fluency", profile?.stage5?.fluencyScore ?? profile?.stage5?.rubric?.fluency],
            ["Vocab", profile?.stage5?.vocabScore ?? profile?.stage5?.vocabularyScore ?? profile?.stage5?.rubric?.vocabularyGrammar],
            ["Confidence", profile?.stage5?.confidenceScore ?? profile?.stage5?.rubric?.confidenceDelivery],
            ["Content", profile?.stage5?.contentScore ?? profile?.stage5?.rubric?.contentRelevance],
          ].map(([label, val]) => (
            <div className="field" key={label}><div className="k">{label}</div><div className="v">{Number.isFinite(Number(val)) && val !== null && val !== undefined && val !== "" ? `${Math.round(Number(val))} / 100` : "—"}</div></div>
          ))}
          <div className="field"><div className="k">Recorded</div><div className="v">{profile?.stage5?.completedAt ? new Date(profile.stage5.completedAt).toLocaleDateString('en-IN') : '—'}</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">06</div>
            <div><div className="stage-detail-name">Live Chart · {profile?.stage6?.totalCharts ? `${profile.stage6.tier || ''} ${profile.stage6.totalCharts} charts` : 'Not Completed'}</div><div className="stage-detail-tag">+{profile?.stageScores?.[6] ?? 0} pts of 20 · {profile?.stage6?.totalCharts ? (profile?.stage6?.verificationMethod || (profile?.stage6?.verified ? 'Verified' : 'Self-Reported')) : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(6)}><><i className="fa-solid fa-laptop" style={{ marginRight: 6 }} />Open Stage 06 Charts</></button></div>
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
            <div><div className="stage-detail-name">Resume Studio · {completedStages.includes(7) ? 'Resume Built & Verified' : 'Not Completed'}</div><div className="stage-detail-tag">0 pts · {completedStages.includes(7) ? 'Built' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(7)}><><i className="fa-solid fa-file-lines" style={{ marginRight: 6 }} />Open Stage 07 Resume</></button></div>
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
            <div><div className="stage-detail-name">Placement &amp; Hiring · {isProfileLive(profile) ? 'Live For Hiring' : (completedStages.includes(8) ? 'Preferences Configured' : 'Not Completed')}</div><div className="stage-detail-tag">0 pts · {completedStages.includes(8) ? 'Ready' : 'Pending'}</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => handleOpenStagesWizard(7)}><><i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} />Open Stage 07 · Go Live</></button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Status</div><div className="v">{isProfileLive(profile) ? 'Live For Hiring' : 'Not Live'}</div></div>
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
          title="Open 7 Stages Wizard to unlock badges"
        >
          <span style={{ color: 'var(--gold-lite)' }}><i className="fa-solid fa-bolt" /></span>
          <span>Open {wizardStageTotal} Stages Dashboard</span>
        </button>
      </div>

      <div className="badge-section priority-required">
        <div className="badge-sec-title">
          <><i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: "var(--red)" }} />Verification Badges</>
          <span className="badge-sec-tag">CORE STAGES</span>
        </div>
        <div className="badge-sec-sub">These come directly from your 8 verification stages and are what companies check first.</div>
        <div className="badge-grid">
          {visibleBadgeCriteria.map((b) => (
            <div className={"badge " + (b.earned ? "earned priority" : "locked")} key={b.key}>
              {b.earned && <div className="badge-crown"><i className="fa-solid fa-crown" /></div>}
              {b.earned && <div className="badge-verified"><i className="fa-solid fa-check" /></div>}
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
          <><i className="fa-solid fa-certificate" style={{ marginRight: 8, color: "var(--gold)" }} />Certification Badges</>
          <span className="badge-sec-tag regular">FROM STAGE 03</span>
        </div>
        <div className="badge-sec-sub">Every certification you've added in Stage 03, shown here automatically.</div>
        <div className="badge-grid">
          {(profile?.stage3?.certifications?.length > 0 ? profile.stage3.certifications : (profile?.stage3?.certCode ? [profile.stage3] : [])).map((cert, idx) => (
            <div className="badge earned" key={cert.memberId || cert.certCode || idx}>
              <div className="badge-verified"><i className="fa-solid fa-check" /></div>
              <div className="badge-ico">{cert.code || cert.certCode || 'CERT'}</div>
              <div className="badge-name">{(cert.body || cert.issuingBody || 'AAPC')} {cert.code || cert.certCode}</div>
              <div className="badge-sub">{cert.name || cert.certName || 'Certification'}</div>
              <span className="badge-value regular">{profile?.stage3?.certStatus === 'verified' ? 'Verified' : 'Pending'}</span>
            </div>
          ))}
          {!(profile?.stage3?.certifications?.length > 0) && !profile?.stage3?.certCode && (
            <div className="badge locked" onClick={() => handleOpenStagesWizard(3)} style={{ cursor: 'pointer' }}>
              <div className="badge-ico"><i className="fa-solid fa-certificate" /></div>
              <div className="badge-name">No Certifications Yet</div>
              <div className="badge-sub">Add one in Stage 03</div>
              <span className="badge-value locked-tag">Locked · Click to Add</span>
            </div>
          )}
        </div>
      </div>

      <div className="badge-section">
        <div className="badge-sec-title">
          <><i className="fa-solid fa-award" style={{ marginRight: 8, color: "var(--gold)" }} />Milestone Badges</>
          <span className="badge-sec-tag achievement">FROM LIVE CHARTS</span>
        </div>
        <div className="badge-sec-sub">Automatic milestones based on your logged live-chart activity.</div>
        <div className="badge-grid">
          <div className={"badge " + (chartsCoded >= 100 ? "earned" : "locked")}>
            {chartsCoded >= 100 && <div className="badge-verified"><i className="fa-solid fa-check" /></div>}
            <div className="badge-ico"><i className="fa-solid fa-check-double" /></div>
            <div className="badge-name">100 Charts Club</div>
            <div className="badge-sub">{chartsCoded >= 100 ? `${chartsCoded} charts logged` : `${chartsCoded} / 100 charts logged`}</div>
            <span className={"badge-value " + (chartsCoded >= 100 ? "regular" : "locked-tag")}>{chartsCoded >= 100 ? 'Earned' : 'Locked'}</span>
          </div>
          <div className={"badge " + (chartsCoded >= 500 ? "earned" : "locked")}>
            {chartsCoded >= 500 && <div className="badge-verified"><i className="fa-solid fa-check" /></div>}
            <div className="badge-ico"><i className="fa-solid fa-mountain" /></div>
            <div className="badge-name">500 Charts Club</div>
            <div className="badge-sub">{chartsCoded >= 500 ? `${chartsCoded} charts logged` : `${chartsCoded} / 500 charts logged`}</div>
            <span className={"badge-value " + (chartsCoded >= 500 ? "regular" : "locked-tag")}>{chartsCoded >= 500 ? 'Earned' : 'Locked'}</span>
          </div>
          <div className={"badge " + (profile?.stage5?.regionalLanguage ? "earned" : "locked")}>
            {profile?.stage5?.regionalLanguage && <div className="badge-verified"><i className="fa-solid fa-check" /></div>}
            <div className="badge-ico"><i className="fa-solid fa-earth-americas" /></div>
            <div className="badge-name">Multilingual</div>
            <div className="badge-sub">{profile?.stage5?.regionalLanguage ? `English + ${profile.stage5.regionalLanguage}` : 'Add a regional-language video in Stage 05'}</div>
            <span className={"badge-value " + (profile?.stage5?.regionalLanguage ? "regular" : "locked-tag")}>{profile?.stage5?.regionalLanguage ? 'Earned' : 'Locked'}</span>
          </div>
          {!isExperiencedProfile(profile) && (
          <div className={"badge " + (profile?.stage4?.medal === 'Gold' ? "earned" : "locked")}>
            {profile?.stage4?.medal === 'Gold' && <div className="badge-verified"><i className="fa-solid fa-check" /></div>}
            <div className="badge-ico"><i className="fa-solid fa-medal" /></div>
            <div className="badge-name">Gold Assessment</div>
            <div className="badge-sub">{profile?.stage4?.medal === 'Gold' ? 'Scored 85+ on the assessment' : 'Score 85+ to unlock'}</div>
            <span className={"badge-value " + (profile?.stage4?.medal === 'Gold' ? "regular" : "locked-tag")}>{profile?.stage4?.medal === 'Gold' ? 'Earned' : 'Locked'}</span>
          </div>
          )}
        </div>
      </div>

      {/* Unlock remaining badges banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', background: 'var(--grad-hero)', color: '#FFFFFF', borderRadius: '16px', marginTop: '24px', border: '1.5px solid rgba(245, 166, 35, 0.45)', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15.5px' }}><><i className="fa-solid fa-rocket" style={{ marginRight: 8 }} />Unlock All 8 Verification Badges</></div>
          <div style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>Complete or improve your scores in the candidate 7 stages verification dashboard.</div>
        </div>
        <button
          type="button"
          onClick={() => handleOpenStagesWizard(1)}
          className="btn-open-stages-hero"
        >
          <><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />Open {wizardStageTotal} Stages Dashboard</>
        </button>
      </div>
    </div>
)}

          {activeTab === 'documents' && (
            <div className="page active" id="page-documents" style={{ padding: 0 }}>
              <CandidateDocumentsSection
                candidate={profile}
                onVaultUpdated={fetchDashboardData}
                onNavigateToResume={() => handleOpenStagesWizard(7)}
                onOpenStage={handleOpenStagesWizard}
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
        {[
          ['all', 'Applied', '', applications.length],
          ['shortlisted', 'Shortlisted', '', applications.filter((a) => a.status === 'shortlisted').length],
          ['interviewing', 'Interviewing', 'active', applications.filter((a) => a.status === 'interviewing').length],
          ['hired', 'Offers', 'selected', applications.filter((a) => a.status === 'hired').length],
          ['on_hold', 'On Hold', 'hold', applications.filter((a) => a.status === 'on_hold').length],
          ['rejected', 'Rejected', 'rejected', applications.filter((a) => a.status === 'rejected').length],
        ].map(([key, label, tint, count]) => (
          <div
            key={key}
            className={"co-pipe-stage " + tint + (companyFilter === key ? " pick" : "")}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onClick={() => setCompanyFilter(key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCompanyFilter(key); }}
          >
            <div className="count">{count}</div><div className="lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="co-list">
        {applications.length > 0 && companyFilter !== 'all' && applications.filter((a) => a.status === companyFilter).length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-mute)' }}>No companies in this stage yet. <a onClick={() => setCompanyFilter('all')} style={{ color: 'var(--gold-deep)', fontWeight: 800, cursor: 'pointer' }}>Show all</a></div>
        ) : applications.length > 0 ? applications.filter((a) => companyFilter === 'all' || a.status === companyFilter).map((app) => {
          const statusMap = {
            applied: { cls: 'applied', label: 'Applied', cta: 'View' },
            shortlisted: { cls: 'shortlisted', label: 'Shortlisted', cta: null },
            interviewing: { cls: 'interviewed', label: 'Interviewing', cta: null },
            hired: { cls: 'selected', label: app.hiringSummary?.offerStatus === 'accepted' ? 'OFFER ACCEPTED ✓' : app.hiringSummary?.offerStatus === 'declined' ? 'OFFER DECLINED' : 'OFFER', cta: app.hiringSummary?.offerStatus === 'sent' ? 'Accept →' : 'View offer' },
            on_hold: { cls: 'hold', label: 'On Hold', cta: null },
            rejected: { cls: 'rejected', label: 'Not Selected', cta: 'Feedback' },
          };
          const st = statusMap[app.status] || statusMap.applied;
          const comp = app.compMin && app.compMax ? `₹${app.compMin} – ₹${app.compMax} LPA` : '';
          return (
            <div className="co-row" key={app._id} onClick={() => setCompanyDetailApp(app)} style={{ cursor: 'pointer' }}>
              <div className="co-logo">{(app.companyName || 'C')[0].toUpperCase()}</div>
              <div className="co-info"><div className="name">{app.companyName} · {app.roleTitle}</div><div className="role">{app.location}{app.workMode ? ` · ${app.workMode}` : ''}{comp ? ` · ${comp}` : ''}</div><div className="timeline">Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}{app.updatedAt && app.updatedAt !== app.createdAt ? ` · Updated ${new Date(app.updatedAt).toLocaleDateString('en-IN')}` : ''}</div></div>
              <div className={"co-status " + st.cls}>{st.label}{roundLabel(app) && !['hired', 'rejected'].includes(app.status) ? ` · ${roundLabel(app)}` : ''}{app.status === 'hired' && comp ? ` · ${comp}` : ''}</div>
              {st.cta && <button className="co-cta-btn" onClick={(e) => { e.stopPropagation(); setCompanyDetailApp(app); }}>{st.cta}</button>}
            </div>
          );
        }) : (
          <div style={{"padding":"30px","textAlign":"center","color":"var(--gray-mute)"}}>You haven't applied to any companies yet. Browse the <a onClick={() => setActiveTab("jobs")} style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}}>Jobs Board</a> to get started.</div>
        )}
      </div>
    </div>
)}

          {companyDetailApp && (() => {
            const a = companyDetailApp;
            const jd = a.jobDetail || {};
            const steps = [['applied', 'Applied'], ['shortlisted', 'Shortlisted'], ['interviewing', 'Interviewing'], [a.status === 'on_hold' ? 'on_hold' : 'hired', a.status === 'on_hold' ? 'On hold' : 'Offer']];
            const order = ['applied', 'shortlisted', 'interviewing', a.status === 'on_hold' ? 'on_hold' : 'hired'];
            const idx = a.status === 'rejected' ? -1 : order.indexOf(a.status);
            const when = a.interviewScheduledAt ? new Date(a.interviewScheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : (a.interviewTimeText || '');
            const row = (label, value) => (value ? <div key={label} style={{ fontSize: 13, marginBottom: 4 }}><b style={{ color: '#334155' }}>{label}:</b> <span style={{ color: '#475569' }}>{value}</span></div> : null);
            return (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setCompanyDetailApp(null)}>
                <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                      <div className="co-logo" style={{ flexShrink: 0 }}>{(a.companyName || 'C')[0].toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0F1B3D' }}>{a.companyName}</div>
                        <div style={{ fontSize: 13, color: '#64748B' }}>{a.roleTitle}{a.location ? ` · ${a.location}` : ''}{a.workMode ? ` · ${a.workMode}` : ''}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setCompanyDetailApp(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94A3B8', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ padding: '18px 24px 24px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 8 }}>APPLICATION STATUS</div>
                    {a.status === 'rejected' ? (
                      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#991B1B' }}>
                        <b>Not selected.</b>{a.rejectionReason ? ` ${a.rejectionReason}` : ''}{a.rejectionDetails ? <div style={{ marginTop: 4, color: '#7F1D1D' }}>{a.rejectionDetails}</div> : null}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        {steps.map(([key, label], i) => (
                          <div key={key} style={{ flex: '1 1 110px', textAlign: 'center', padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: i <= idx ? '#0F1B3D' : '#F1F5F9', color: i <= idx ? '#fff' : '#64748B' }}>
                            {i < idx ? '✓ ' : ''}{label}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.status === 'hired' && a.hiringSummary?.offer && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', margin: '0 0 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#166534', marginBottom: 6 }}>YOUR OFFER</div>
                        {row('Role', a.hiringSummary.offer.role || a.roleTitle)}
                        {a.hiringSummary.offer.ctc != null && row('CTC', `${a.hiringSummary.offer.ctc} LPA`)}
                        {a.hiringSummary.offer.joinDate && row('Joining date', new Date(a.hiringSummary.offer.joinDate).toLocaleDateString('en-IN', { dateStyle: 'medium' }))}
                        {a.hiringSummary.offer.probationMonths != null && row('Probation', `${a.hiringSummary.offer.probationMonths} month${a.hiringSummary.offer.probationMonths === 1 ? '' : 's'}`)}
                        {a.hiringSummary.offer.status === 'sent' ? (
                          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button type="button" disabled={respondingOffer} onClick={() => respondToOffer(a, true)} style={{ background: '#15803D', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 800, cursor: 'pointer' }}>Accept offer</button>
                            <button type="button" disabled={respondingOffer} onClick={() => respondToOffer(a, false)} style={{ background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 8, padding: '9px 16px', fontWeight: 800, cursor: 'pointer' }}>Decline</button>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: a.hiringSummary.offer.status === 'accepted' ? '#166534' : '#B91C1C' }}>
                            {a.hiringSummary.offer.status === 'accepted' ? '✓ You accepted this offer. The company has been notified and will share joining details.' : 'You declined this offer.'}
                          </div>
                        )}
                      </div>
                    )}
                    {a.hiringSummary && (
                      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '10px 14px', margin: '0 0 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#5B21B6', marginBottom: 6 }}>HIRING ROUNDS</div>
                        {row('Current round', roundLabel(a) || (a.hiringSummary.stage === 'rejected' ? 'Closed' : ''))}
                        {a.hiringSummary.examScore != null && row('Round 1 · Exam', `${a.hiringSummary.examScore}%${a.hiringSummary.examPassed ? ' · Passed' : ' · Below cutoff'}`)}
                        {a.hiringSummary.techScore != null && row('Round 2 · Technical', `${a.hiringSummary.techScore}%${a.hiringSummary.techPassed ? ' · Passed' : ' · Below cutoff'}`)}
                        {a.hiringSummary.hrDone && row('Round 3 · HR', 'Completed')}
                      </div>
                    )}
                    {a.createdAt && row('Applied on', new Date(a.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }))}
                    {(when || a.interviewType || a.interviewMeetingLink) && (
                      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', margin: '12px 0' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#B45309', marginBottom: 6 }}>INTERVIEW</div>
                        {row('When', when)}
                        {row('Mode', a.interviewType)}
                        {a.interviewMeetingLink && row('Link / address', a.interviewMeetingLink)}
                      </div>
                    )}
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#94A3B8', margin: '18px 0 8px' }}>JOB DETAILS</div>
                    {row('Role', jd.title || a.roleTitle)}
                    {row('Salary', jd.salary && jd.salary !== 'Not disclosed' ? jd.salary : '')}
                    {row('Experience', jd.experience)}
                    {row('Openings', jd.openings)}
                    {row('Specialty', jd.specialty)}
                    {Array.isArray(jd.certsRequired) && jd.certsRequired.length > 0 && row('Certification', jd.certsRequired.join(', '))}
                    {(jd.details || []).map((d) => row(d.label, d.value))}
                    {jd.description && <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '10px 0 0' }}>{jd.description}</p>}
                    {jd.mustHaves && <div style={{ fontSize: 13, color: '#334155', marginTop: 8 }}><b>Key must-haves:</b> {jd.mustHaves}</div>}
                    {!jd.description && !jd.mustHaves && (!jd.details || jd.details.length === 0) && (
                      <p style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic' }}>The employer has not added more details for this role.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'applications' && (
<div className="page active" id="page-applications">
      <div className="page-head">
        <div className="page-eyebrow">Application timeline</div>
        <h1 className="page-title">My Applications</h1>
        <p className="page-sub">{applications.length > 0 ? `${applications.length} total application${applications.length === 1 ? '' : 's'} submitted or auto-matched.` : "You haven't submitted any applications yet."}</p>
      </div>
      {applications.length > 0 ? (
        <div className="co-list">
          {[...applications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map((app) => {
            const labels = { applied: ['applied', 'Applied'], shortlisted: ['shortlisted', 'Shortlisted'], interviewing: ['interviewed', 'Interviewing'], hired: ['selected', 'Offer'], on_hold: ['hold', 'On Hold'], rejected: ['rejected', 'Not Selected'] };
            const [cls, label] = labels[app.status] || labels.applied;
            const comp = app.compMin && app.compMax ? `₹${app.compMin} – ₹${app.compMax} LPA` : '';
            return (
              <div className="co-row" key={app._id} onClick={() => setCompanyDetailApp(app)} style={{ cursor: 'pointer' }}>
                <div className="co-logo">{(app.companyName || 'C')[0].toUpperCase()}</div>
                <div className="co-info">
                  <div className="name">{app.companyName || 'Company'} · {app.roleTitle || 'Role'}</div>
                  <div className="role">{app.location}{app.workMode ? ` · ${app.workMode}` : ''}{comp ? ` · ${comp}` : ''}</div>
                  <div className="timeline">Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : '—'}{app.updatedAt && app.updatedAt !== app.createdAt ? ` · Updated ${new Date(app.updatedAt).toLocaleDateString('en-IN')}` : ''}</div>
                </div>
                <div className={"co-status " + cls}>{label}{roundLabel(app) && !['hired', 'rejected'].includes(app.status) ? ` · ${roundLabel(app)}` : ''}</div>
                <button className="co-cta-btn" onClick={(e) => { e.stopPropagation(); setCompanyDetailApp(app); }}>View</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray-mute)' }}>You haven&apos;t applied to any companies yet. Browse the <a onClick={() => setActiveTab("jobs")} style={{ color: 'var(--gold-deep)', fontWeight: 800, cursor: 'pointer' }}>Jobs Board</a> to get started.</div></div>
      )}
      {applications.length > 0 && (
        <p style={{ color: 'var(--gray-txt)', fontSize: '13px', marginTop: 14 }}>See <a onClick={() => setActiveTab("companies")} style={{ color: 'var(--gold-deep)', fontWeight: 800, cursor: 'pointer' }}>My Companies →</a> for the stage-by-stage pipeline view.</p>
      )}
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
            <div className={"co-status " + (inv.status === 'confirmed' ? 'selected' : 'shortlisted')}>{inv.status === 'confirmed' ? 'Confirmed' : 'Pending'}</div>
            {inv.status !== 'confirmed' && <button className="co-cta-btn" disabled={confirmingInviteId === inv.id} onClick={() => confirmInvite(inv.id)}>{confirmingInviteId === inv.id ? 'Confirming…' : 'Confirm'}</button>}
            {inv.status === 'confirmed' && inv.meetingLink && <a className="co-cta-btn" href={inv.meetingLink} target="_blank" rel="noreferrer">Join</a>}
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

          {activeTab === 'hiring' && (
            <div className="page active" id="page-hiring" style={{ padding: 0 }}>
              <CandidateHiringSection triggerToast={typeof triggerToast === 'function' ? triggerToast : undefined} onChanged={refreshApplications} />
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
          <span style={{"fontSize":"18px","lineHeight":"1"}}><i className="fa-solid fa-plus" /></span> Add New Employment
        </button>
      </div>

      {showAddJobForm && (
      <div className="add-employment-form" id="addJobForm" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"16px","padding":"28px 30px","marginBottom":"20px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"20px"}}>
          <h2 style={{"fontSize":"18px","fontWeight":"800","color":"var(--navy)","margin":"0","display":"flex","alignItems":"center","gap":"10px"}}><><i className="fa-solid fa-briefcase" style={{ marginRight: 8 }} />Add Your New Job at a Company</></h2>
          <button onClick={() => setShowAddJobForm(!showAddJobForm)} style={{"background":"transparent","color":"var(--gray-mute)","fontSize":"22px","fontWeight":"800","cursor":"pointer","padding":"0 8px"}}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-building" style={{ marginRight: 6 }} />Company Name *</></label>
            <input type="text" value={employmentForm.companyName} onChange={(e) => setEmploymentForm({ ...employmentForm, companyName: e.target.value })} placeholder="e.g. Optum India" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-briefcase" style={{ marginRight: 6 }} />Your Role / Designation *</></label>
            <input type="text" value={employmentForm.role} onChange={(e) => setEmploymentForm({ ...employmentForm, role: e.target.value })} placeholder="e.g. HCC Medical Coder" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-stethoscope" style={{ marginRight: 6 }} />Department / Specialty</></label>
            <input type="text" value={employmentForm.specialty} onChange={(e) => setEmploymentForm({ ...employmentForm, specialty: e.target.value })} placeholder="e.g. HCC · Risk Adjustment" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-location-dot" style={{ marginRight: 6 }} />Work Location *</></label>
            <input type="text" value={employmentForm.location} onChange={(e) => setEmploymentForm({ ...employmentForm, location: e.target.value })} placeholder="e.g. Hyderabad · Onsite" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-calendar-days" style={{ marginRight: 6 }} />Joining Date *</></label>
            <input type="date" value={employmentForm.joiningDate} onChange={(e) => setEmploymentForm({ ...employmentForm, joiningDate: e.target.value })} style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-sack-dollar" style={{ marginRight: 6 }} />Base CTC (₹ LPA) *</></label>
            <input type="text" value={employmentForm.ctc} onChange={(e) => setEmploymentForm({ ...employmentForm, ctc: e.target.value })} placeholder="6.8" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-building" style={{ marginRight: 6 }} />Employment Type</></label>
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
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>UAN Number</label>
            <input type="text" value={employmentForm.uan} onChange={(e) => setEmploymentForm({ ...employmentForm, uan: e.target.value })} placeholder="12-digit UAN" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-user" style={{ marginRight: 6 }} />Reporting Manager</></label>
            <input type="text" value={employmentForm.manager} onChange={(e) => setEmploymentForm({ ...employmentForm, manager: e.target.value })} placeholder="Manager name" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}><><i className="fa-solid fa-clipboard-list" style={{ marginRight: 6 }} />Project / Client</></label>
            <input type="text" value={employmentForm.project} onChange={(e) => setEmploymentForm({ ...employmentForm, project: e.target.value })} placeholder="e.g. UnitedHealthcare" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"flex","gap":"10px","marginTop":"20px","justifyContent":"flex-end"}}>
          <button onClick={() => setShowAddJobForm(false)} style={{"background":"transparent","color":"var(--gray-txt)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"700","border":"1.5px solid var(--border)","cursor":"pointer"}}>Cancel</button>
          <button disabled={savingEmployment} onClick={handleSaveEmployment} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 26px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer"}}>{savingEmployment ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
      )}

      {profile?.stage8?.currentEmployment ? (
      <div className="card" style={{"background":"linear-gradient(135deg,var(--green-soft),#F5FDF9)","border":"2px solid var(--green)","padding":"22px 26px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","marginBottom":"16px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"16px"}}>
            <div className="co-logo" style={{"width":"64px","height":"64px","borderRadius":"16px","fontSize":"22px"}}>{(profile.stage8.currentEmployment.companyName || 'C')[0].toUpperCase()}</div>
            <div>
              <div style={{"color":"var(--green)","fontSize":"11px","fontWeight":"800","letterSpacing":"1.2px","textTransform":"uppercase"}}>CURRENT EMPLOYMENT</div>
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
        <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":"0 0 14px","display":"flex","alignItems":"center","gap":"10px"}}><div className="mod-ico"><i className="fa-solid fa-calendar-days" /></div>Your Lifetime Employment History</h3>
        <div style={{"background":"var(--white)","border":"1px solid var(--border)","borderRadius":"14px","padding":"22px 26px"}}>
          {Array.isArray(profile?.stage8?.employmentHistory) && profile.stage8.employmentHistory.length > 0 ? (
          <div style={{"position":"relative","paddingLeft":"28px"}}>
            <div style={{"position":"absolute","left":"12px","top":"14px","bottom":"14px","width":"2px","background":"var(--gold-pale)"}}></div>
            {profile.stage8.employmentHistory.map((job, idx) => (
              <div style={{"position":"relative","padding":"14px 0 18px"}} key={job.id || idx}>
                <div style={{"position":"absolute","left":"-19px","top":"20px","width":"14px","height":"14px","background": job.status === 'active' ? 'var(--green)' : 'var(--gray-mute)',"border":"3px solid var(--white)","borderRadius":"50%"}}></div>
                <div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800","letterSpacing":".4px"}}>{job.joiningDate ? new Date(job.joiningDate).toLocaleDateString('en-IN') : ''} · {job.status === 'active' ? 'ACTIVE' : 'PAST'}</div>
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
        <div className="placeholder-ico"><i className="fa-solid fa-book" /></div>
        <div className="placeholder-title">Full Learning Hub — Coming Soon</div>
        <div className="placeholder-sub">Interview prep videos, an RCM question bank filterable by specialty, and partner academy enrollment, with recommendations based on your Assessment results.</div>
      </div>
    </div>
)}

          {activeTab === 'companydetails' && <CompanyFullDetails />}

          {activeTab === 'analytics' && (
<div className="page active" id="page-analytics">
      <div className="page-head">
        <div className="page-eyebrow">Deep career metrics</div>
        <h1 className="page-title">Career Analytics</h1>
      </div>
      {applications.length > 0 ? (
      <div className="quick-stats">
        <div className="qs-card"><div className="qs-ico blue"><i className="fa-solid fa-bullseye" /></div><div><div className="qs-val">{Math.round((applications.filter((a) => ['shortlisted','interviewing','hired'].includes(a.status)).length / applications.length) * 100)}%</div><div className="qs-lbl">Shortlist Rate</div></div></div>
        <div className="qs-card"><div className="qs-ico green"><i className="fa-solid fa-check" /></div><div><div className="qs-val">{applications.filter((a) => ['interviewing','hired'].includes(a.status)).length > 0 ? Math.round((applications.filter((a) => a.status === 'hired').length / applications.filter((a) => ['interviewing','hired'].includes(a.status)).length) * 100) : 0}%</div><div className="qs-lbl">Interview-to-Offer</div></div></div>
        <div className="qs-card"><div className="qs-ico gold"><i className="fa-solid fa-calendar-days" /></div><div><div className="qs-val">{profile?.createdAt ? Math.floor((Date.now() - new Date(profile.createdAt)) / 86400000) : 0}</div><div className="qs-lbl">Days on Talentera</div></div></div>
        <div className="qs-card"><div className="qs-ico purple"><i className="fa-solid fa-sack-dollar" /></div><div><div className="qs-val">{bestOfferCtc > 0 ? `₹${bestOfferCtc}` : '—'}</div><div className="qs-lbl">Best CTC (LPA)</div></div></div>
      </div>
      ) : (
      <div className="placeholder-page">
        <div className="placeholder-ico"><i className="fa-solid fa-chart-pie" /></div>
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
          <div className="setting-row"><div><div className="setting-label">Profile Live for Hiring</div><div className="setting-desc">Companies can find you</div></div><div className={"toggle " + (isProfileLive(profile) ? "on" : "")} onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
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
        <div className="page-eyebrow">Ask a question · Our team replies here</div>
        <h1 className="page-title">Help & Support</h1>
      </div>
      <SupportEnquiries />
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
              <div className="ico-lg"><i className="fa-solid fa-link" /></div>
              <div style={{ flex: 1 }}>
                <div className="title">How Your Referral Works</div>
                <div className="sub">Fully automatic — you just share the link</div>
              </div>
              <button className="close" onClick={() => setShowReferralInfoModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--gray-txt)', lineHeight: '1.6', margin: '0 0 20px' }}>Here's exactly what happens after you share your link. Talentera tracks every step automatically — no manual follow-up needed.</p>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">1</div>
                  <div className="modal-step-title">Your unique referral link is generated</div>
                </div>
                <div className="modal-step-body">Every link is tagged with your Candidate ID, so Talentera knows exactly who to credit when your friend signs up.</div>
                <div className="modal-link-row">
                  <code>{referralLink || 'Loading your link…'}</code>
                  <button onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(referralLink); triggerToast('Link copied to clipboard'); } }}><><i className="fa-solid fa-clipboard" style={{ marginRight: 6 }} />Copy</></button>
                </div>
              </div>

              <div className="modal-step">
                <div className="modal-step-head">
                  <div className="modal-step-num">2</div>
                  <div className="modal-step-title">Share with your friend · Any channel works</div>
                </div>
                <div className="modal-step-body">Send it over WhatsApp, LinkedIn, email, or however you'd normally reach them.</div>
                <div className="modal-share-row">
                  <button className="modal-share-btn" style={{ background: '#25D366' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('WhatsApp share opened'); }}><><i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />WhatsApp</></button>
                  <button className="modal-share-btn" style={{ background: '#0A66C2' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('LinkedIn share opened'); }}><><i className="fa-brands fa-linkedin" style={{ marginRight: 6 }} />LinkedIn</></button>
                  <button className="modal-share-btn" style={{ background: 'var(--red)' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('Email composer opened'); }}><><i className="fa-solid fa-envelope" style={{ marginRight: 6 }} />Email</></button>
                  <button className="modal-share-btn" style={{ background: '#0088CC' }} onClick={() => { setShowReferralInfoModal(false); triggerToast('Telegram opened'); }}><><i className="fa-brands fa-telegram" style={{ marginRight: 6 }} />Telegram</></button>
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
                <div className="modal-outcome-title"><><i className="fa-solid fa-sack-dollar" style={{ marginRight: 6 }} />Redeem anytime</></div>
                <div className="modal-outcome-row"><span>Current wallet balance</span><span></span><b>{referrals?.pointsWallet ?? 0} pts</b></div>
                <div className="modal-outcome-row"><span>Approx. cash value</span><span></span><b>≈ ₹{Math.round((referrals?.pointsWallet ?? 0) / 2)}</b></div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="hint">Fair play: points vest once your friend verifies their profile · self-referrals are blocked.</div>
              <button className="cta" onClick={() => { setShowReferralInfoModal(false); if (navigator.clipboard) { navigator.clipboard.writeText(referralLink); triggerToast('Link copied. Ready to share.'); } }}><><i className="fa-solid fa-clipboard" style={{ marginRight: 6 }} />Copy</> My Link →</button>
            </div>
          </div>
        </div>
      )}

      {showScoreBreakdownModal && (
        <div className="modal-overlay show" onClick={() => setShowScoreBreakdownModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="ico-lg"><i className="fa-solid fa-chart-pie" /></div>
              <div style={{ flex: 1 }}>
                <div className="title">Your {profileScore}/100 Score — Full Breakdown</div>
                <div className="sub">Exactly where every point comes from, and how to earn the rest</div>
              </div>
              <button className="close" onClick={() => setShowScoreBreakdownModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '12.5px', color: 'var(--gray-txt)', lineHeight: '1.6', margin: '0 0 20px' }}>Your Passport Score is calculated live across all 8 verification stages. Complete a stage — or upgrade a partially-scored one — and this number updates instantly.</p>

              {getScoreBreakdown(profile).map((row) => {
                const pct = row.max > 0 ? Math.round((row.earned / row.max) * 100) : 0;
                const complete = row.earned >= row.max;
                return (
                  <div className="modal-step" key={row.num} style={{ borderLeftColor: complete ? 'var(--green, #1FA34A)' : 'var(--gold)' }}>
                    <div className="modal-step-head">
                      <div className="modal-step-num">{String(row.num).padStart(2, '0')}</div>
                      <div style={{ flex: 1 }}>
                        <div className="modal-step-title">{row.name}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: complete ? 'var(--green, #1FA34A)' : 'var(--navy)' }}>{row.earned} / {row.max} pts</div>
                    </div>
                    <div style={{ height: '6px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', margin: '0 0 8px 44px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'linear-gradient(90deg,#1FA34A,#45C97A)' : 'var(--grad-gold)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                    <div className="modal-step-body">
                      {complete ? <><i className="fa-solid fa-circle-check" style={{ color: 'var(--green, #1FA34A)', marginRight: 6 }} /></> : <><i className="fa-solid fa-lightbulb" style={{ color: 'var(--gold)', marginRight: 6 }} /></>}
                      {row.tip}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <div className="hint">Points update automatically the moment you complete or improve a stage — no re-verification needed.</div>
              <button className="cta" onClick={() => { setShowScoreBreakdownModal(false); handleOpenStagesWizard(1); }}><><i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />Improve My Score</></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
