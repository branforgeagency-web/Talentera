import React, { useState, useEffect } from 'react';
import api from '../api/client';
import './CandidateDashboard.css';

export default function CandidateDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [referralModal, setReferralModal] = useState({ open: false, title: '', sub: '', link: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('modern');

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
        p = res.data?.candidate || res.data;
      } catch (err) {
        try {
          const resMe = await api.get('/candidate/me');
          p = resMe.data?.candidate || resMe.data;
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
        setReferrals(resRef.data?.referrals || resRef.data || []);
      } catch (e) {}

      try {
        const resVault = await api.get('/candidate/vault');
        setVaultDocs(resVault.data?.documents || resVault.data?.vault || []);
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

  const completedStages = profile?.completedStages || [];
  const candidateName = profile?.stage1?.fullname || profile?.stage1?.fullName || profile?.fullname || (profile?.email ? profile.email.split('@')[0] : 'Candidate');
  const candidateEmail = profile?.email || '';
  const candidatePhone = profile?.stage1?.mobile || profile?.mobile || '';
  const profileCompleteness = Math.min(100, Math.round((completedStages.length / 8) * 100));
  const referralCode = profile?._id ? profile._id.slice(-6).toUpperCase() : 'TALENT';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${profile?._id || ''}` : '';

  // Handle PDF Download
  const handleDownloadPdf = () => {
    triggerToast('Opening print dialog to save verified resume as PDF...');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Handle DOCX / Text Download
  const handleDownloadDocx = () => {
    const resumeText = [
      '=============================================================',
      'TALENTERA VERIFIED CANDIDATE RESUME',
      '=============================================================',
      'Candidate Name : ' + candidateName,
      'Email          : ' + candidateEmail,
      'Mobile         : ' + (candidatePhone || 'N/A'),
      'Location       : ' + (profile?.stage1?.city || 'India'),
      'Role / Domain  : ' + (profile?.stage5?.preferredRoles || 'Candidate'),
      '',
      '-------------------------------------------------------------',
      'CAREER OBJECTIVE & SUMMARY',
      '-------------------------------------------------------------',
      (profile?.stage7?.objective || profile?.stage7?.summary || profile?.stage1?.summary || 'Dedicated professional with verified domain credentials.'),
      '',
      '-------------------------------------------------------------',
      'EDUCATION & ACADEMICS',
      '-------------------------------------------------------------',
      'Degree         : ' + (profile?.stage2?.degree || 'Bachelor Degree') + (profile?.stage2?.branch ? ' (' + profile.stage2.branch + ')' : ''),
      'Institution    : ' + (profile?.stage2?.college || 'University'),
      'Year of Passing: ' + (profile?.stage2?.gradYear || 'Completed'),
      'CGPA / Marks   : ' + (profile?.stage2?.cgpa || 'N/A'),
      '',
      '-------------------------------------------------------------',
      'EXPERIENCE & INTERNSHIPS',
      '-------------------------------------------------------------',
      (profile?.stage3?.company ? 'Company: ' + profile.stage3.company + '\nRole: ' + (profile.stage3.designation || 'Specialist') + '\nExperience: ' + (profile.stage3.experienceYears || '0') + ' Years\nDetails: ' + (profile.stage3.responsibilities || 'N/A') : 'Fresher with certified foundational training and project assessments.'),
      '',
      '-------------------------------------------------------------',
      'SKILLS & COMPETENCIES',
      '-------------------------------------------------------------',
      (Array.isArray(profile?.stage4?.skills) ? profile.stage4.skills.join(', ') : 'Domain Skills, Problem Solving, Analytical Thinking'),
      '',
      '=============================================================',
      'Verification Code : TLN-' + (profile?._id ? profile._id.slice(-8).toUpperCase() : 'AUTH'),
      '============================================================='
    ].join('\n');

    const blob = new Blob([resumeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = candidateName.replace(/\s+/g, '_') + '_Talentera_Resume.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast('Resume document downloaded successfully!');
  };

  // Copy Live Resume URL
  const copyLiveResumeUrl = () => {
    const liveUrl = window.location.origin + '/candidate/resume/' + (profile?._id || '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(liveUrl);
      triggerToast('Live resume URL copied to clipboard!');
    }
  };

  const handleSaveEmployment = () => {
    triggerToast('Employment details saved successfully.');
    setShowAddJobForm(false);
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
        <div className="brand-nav">
          <div className="brand-logo-sm">T</div>
          <div>
            <div className="brand-name">TALENTERA</div>
            <div className="brand-tag">Student &amp; Candidate Portal</div>
          </div>
        </div>

        <div className="top-actions">
          <div className="top-search">
            <span style={{ color: 'var(--muted)' }}>🔍</span>
            <input type="text" placeholder="Search jobs, stages, badges..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '220px', color: 'var(--navy)' }} />
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
                {profileCompleteness === 100 ? 'Verified Candidate' : 'Stage ' + completedStages.length + '/8'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-group">
            <div className="sb-group-label">STUDENT DASHBOARD</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'dashboard' ? 'active' : '')} onClick={() => setActiveTab('dashboard')}>
                <span className="ico">📊</span>
                <span>My Hub</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'profile' ? 'active' : '')} onClick={() => setActiveTab('profile')}>
                <span className="ico">👤</span>
                <span>My Profile</span>
                <span className="badge green">{profileCompleteness}%</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'badges' ? 'active' : '')} onClick={() => setActiveTab('badges')}>
                <span className="ico">🏅</span>
                <span>My Badges</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'documents' ? 'active' : '')} onClick={() => setActiveTab('documents')}>
                <span className="ico">📁</span>
                <span>My Documents</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'resumes' ? 'active' : '')} onClick={() => setActiveTab('resumes')}>
                <span className="ico">📄</span>
                <span>My Resumes</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">HIRING &amp; EMPLOYERS</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'companies' ? 'active' : '')} onClick={() => setActiveTab('companies')}>
                <span className="ico">🏢</span>
                <span>My Companies</span>
                <span className="badge gold">{companies.length}</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'applications' ? 'active' : '')} onClick={() => setActiveTab('applications')}>
                <span className="ico">📋</span>
                <span>My Applications</span>
                <span className="badge gold">{applications.length}</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'invites' ? 'active' : '')} onClick={() => setActiveTab('invites')}>
                <span className="ico">💌</span>
                <span>Interview Invites</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'feedback' ? 'active' : '')} onClick={() => setActiveTab('feedback')}>
                <span className="ico">💬</span>
                <span>Feedback Vault</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">GROW</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'jobs' ? 'active' : '')} onClick={() => setActiveTab('jobs')}>
                <span className="ico">🔍</span>
                <span>Browse Jobs</span>
                <span className="badge blue">{jobs.length}</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'learning' ? 'active' : '')} onClick={() => setActiveTab('learning')}>
                <span className="ico">📚</span>
                <span>Learning Hub</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'analytics' ? 'active' : '')} onClick={() => setActiveTab('analytics')}>
                <span className="ico">📈</span>
                <span>Career Analytics</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">🎁 EARN · 3 ENGINES</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'refer' ? 'active' : '')} onClick={() => setActiveTab('refer')}>
                <span className="ico">🎁</span>
                <span>Refer to Portal</span>
                <span className="badge gold">0 pts</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'employer-referrals' ? 'active' : '')} onClick={() => setActiveTab('employer-referrals')}>
                <span className="ico">🏢</span>
                <span>Employer Referrals</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'academy-referrals' ? 'active' : '')} onClick={() => setActiveTab('academy-referrals')}>
                <span className="ico">🏫</span>
                <span>Academy Referrals</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">VERIFICATION</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'employment' ? 'active' : '')} onClick={() => setActiveTab('employment')}>
                <span className="ico">🛡️</span>
                <span>Employment &amp; BG</span>
              </div>
            </div>
          </div>

          <div className="sb-group">
            <div className="sb-group-label">ACCOUNT</div>
            <div className="sb-nav">
              <div className={'sb-item ' + (activeTab === 'settings' ? 'active' : '')} onClick={() => setActiveTab('settings')}>
                <span className="ico">⚙️</span>
                <span>Settings</span>
              </div>
              <div className={'sb-item ' + (activeTab === 'help' ? 'active' : '')} onClick={() => setActiveTab('help')}>
                <span className="ico">❓</span>
                <span>Help &amp; Support</span>
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
            <div className="wh-name">Ananya Sharma</div>
            <div className="wh-tagline">Your Career Passport is live. 142 companies matching. 3 pending interview invites.</div>
            <div className="wh-badges">
              <span className="wh-chip gold">🏆 Talentera Verified</span>
              <span className="wh-chip green">🟢 LIVE FOR HIRING</span>
              <span className="wh-chip">🎓 Fresher · Medical Coding</span>
              <span className="wh-chip">📍 Bengaluru</span>
            </div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div className="stamp-ring"><div className="stamp-inner"><div><div className="stamp-big">100</div><div className="stamp-small">/ 100</div></div></div></div>
          </div>
        </div>
      </div>

      <div className="quick-stats">
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico blue">🏢</div><div><div className="qs-val">7</div><div className="qs-lbl">Companies Attended</div><div className="qs-trend">↑ 3 new this week</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("companies")}><div className="qs-ico green">✓</div><div><div className="qs-val">2</div><div className="qs-lbl">Offers Received</div><div className="qs-trend">↑ Best ₹6.8 LPA</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("profile")}><div className="qs-ico gold">💻</div><div><div className="qs-val">141</div><div className="qs-lbl">Charts Coded</div><div className="qs-trend">↑ 22 this week</div></div></div>
        <div className="qs-card" onClick={() => setActiveTab("badges")}><div className="qs-ico purple">🎖</div><div><div className="qs-val">14</div><div className="qs-lbl">Badges Earned</div><div className="qs-trend">↑ 2 unlocked</div></div></div>
      </div>

      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🎯</div>Priority Actions</div></div>
        <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","borderColor":"var(--gold)"}}>
          <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"12px"}}>
            <button onClick={() => setActiveTab("companies")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico green">✉</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Accept Optum Offer</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Decision due Sep 25</div></div></button>
            <button onClick={() => setActiveTab("invites")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico blue">📅</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>2 Interviews Pending</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Optum Final · Access HR</div></div></button>
            <button onClick={() => setActiveTab("learning")} className="qs-card" style={{"textAlign":"left","background":"var(--white)"}}><div className="qs-ico purple">📚</div><div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13px"}}>Improve to Gold</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>60 more charts needed</div></div></button>
          </div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'profile' && (
<div className="page active" id="page-profile">
      <div className="page-head">
        <div className="page-eyebrow">Verified Profile · Auto-updates when you improve any stage</div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-sub">Everything companies see about you — pulled live from your 8 verification stages. Click any stage to edit at source.</p>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">AS</div>
          <div className="profile-avatar-edit" onClick={() => triggerToast("Photo upload started. Choose a professional photo.")} title="Change photo">📷</div>
        </div>
        <div className="profile-info">
          <div className="profile-name">Ananya Sharma</div>
          <div className="profile-title">Medical Coding Fresher · CPC + CRC + CDC · Silver Verified</div>
          <div className="profile-meta">
            <span className="wh-chip green">🟢 LIVE FOR HIRING</span>
            <span className="wh-chip gold">🏆 100/100 Verified</span>
            <span className="wh-chip">📍 Bengaluru, Karnataka</span>
            <span className="wh-chip">🎂 24 yrs · Female</span>
          </div>
        </div>
        <button className="profile-cta" onClick={() => triggerToast("Redirecting to preview mode")}>👁 Preview as Company</button>
      </div>

      <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":"24px 0 14px"}}>Your 8 Verification Stages</h3>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">01</div>
            <div><div className="stage-detail-name">Identity · Aadhaar Verified</div><div className="stage-detail-tag">+15 pts · Locked</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Opening Stage 01 editor")}>✎ Edit</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Full Name</div><div className="v">Ananya Sharma</div></div>
          <div className="field"><div className="k">DOB</div><div className="v">14 Mar 2001 · 🔒</div></div>
          <div className="field"><div className="k">Gender</div><div className="v">Female · 🔒</div></div>
          <div className="field"><div className="k">Mobile</div><div className="v">98765 43210 ✓</div></div>
          <div className="field"><div className="k">Email</div><div className="v">ananya@example.com ✓</div></div>
          <div className="field"><div className="k">Locality</div><div className="v">Koramangala, Bengaluru</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">02</div>
            <div><div className="stage-detail-name">Foundation · Apex Institute</div><div className="stage-detail-tag">+15 pts · Academy-Signed</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Opening Stage 02 editor")}>✎ Edit</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Academy</div><div className="v">Apex Medical Coding</div></div>
          <div className="field"><div className="k">Domain</div><div className="v">Medical Coding</div></div>
          <div className="field"><div className="k">Level</div><div className="v">Intermediate</div></div>
          <div className="field"><div className="k">Specialties</div><div className="v">HCC + E/M</div></div>
          <div className="field"><div className="k">Duration</div><div className="v">6 months</div></div>
          <div className="field"><div className="k">Score</div><div className="v">87 / 100</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">03</div>
            <div><div className="stage-detail-name">Certifications · 3 Active</div><div className="stage-detail-tag">+15 pts · API-Verified</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Opening Stage 03 editor")}>➕ Add Cert</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">CPC</div><div className="v">AAPC ****8267 · Active</div></div>
          <div className="field"><div className="k">CRC</div><div className="v">AAPC ****9314 · Active</div></div>
          <div className="field"><div className="k">CDC</div><div className="v">AAPC ****4128 · Active</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">04</div>
            <div><div className="stage-detail-name">Assessment · Silver 74/100</div><div className="stage-detail-tag">+20 pts · Talentera-Proctored</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Retake unlocks Sep 23")}>🔄 Retake</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Anatomy</div><div className="v">85 / 100</div></div>
          <div className="field"><div className="k">Med Term</div><div className="v">78 / 100</div></div>
          <div className="field"><div className="k">Aptitude</div><div className="v">65 / 100</div></div>
          <div className="field"><div className="k">Basic ICD</div><div className="v">70 / 100</div></div>
          <div className="field"><div className="k">HCC + E/M</div><div className="v">62 / 100</div></div>
          <div className="field"><div className="k">Attempts</div><div className="v">1 of 5 lifetime</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">05</div>
            <div><div className="stage-detail-name">Video Pitch · Silver 78/100</div><div className="stage-detail-tag">+15 pts · Live Verified</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Opening video player")}>▶ Play</button><button className="btn-secondary" onClick={() => triggerToast("Update available in 47 days")}>🔄 Refresh</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">Clarity</div><div className="v">82 / 100</div></div>
          <div className="field"><div className="k">Fluency</div><div className="v">75 / 100</div></div>
          <div className="field"><div className="k">Vocab</div><div className="v">80 / 100</div></div>
          <div className="field"><div className="k">Confidence</div><div className="v">70 / 100</div></div>
          <div className="field"><div className="k">Content</div><div className="v">82 / 100</div></div>
          <div className="field"><div className="k">Recorded</div><div className="v">14 Sep 2026</div></div>
        </div>
      </div>

      <div className="stage-detail">
        <div className="stage-detail-head">
          <div className="stage-detail-title">
            <div className="stage-detail-num">06</div>
            <div><div className="stage-detail-name">Live Chart · Silver 141 charts</div><div className="stage-detail-tag">+20 pts · API-Verified</div></div>
          </div>
          <div className="stage-detail-actions"><button className="btn-secondary" onClick={() => triggerToast("Sync started")}>🔄 Sync now</button></div>
        </div>
        <div className="stage-fields">
          <div className="field"><div className="k">HCC</div><div className="v">65 · 87%</div></div>
          <div className="field"><div className="k">E/M</div><div className="v">48 · 82%</div></div>
          <div className="field"><div className="k">ED</div><div className="v">20 · 78%</div></div>
          <div className="field"><div className="k">Surgery</div><div className="v">8 · 85%</div></div>
          <div className="field"><div className="k">Platform</div><div className="v">Practicode + Codivia</div></div>
          <div className="field"><div className="k">Last coded</div><div className="v">🟢 2 days ago</div></div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'badges' && (
<div className="page active" id="page-badges">
      <div className="page-head">
        <div className="page-eyebrow">Your visual credibility · What companies scan first</div>
        <h1 className="page-title">My Badges</h1>
        <p className="page-sub">🔴 <b>Red-priority badges are what companies REQUIRE to shortlist you.</b> Gold badges are Talentera achievements. Purple badges are lifetime specials. Companies filter shortlists by red priority first.</p>
      </div>

      
      <div className="badge-section priority-required">
        <div className="badge-sec-title">
          🔴 High Priority · Company-Required Badges
          <span className="badge-sec-tag">MUST-HAVE</span>
        </div>
        <div className="badge-sec-sub">These are the <b>MUST-HAVE badges</b> that RCM companies filter on before shortlisting. Missing any of these = 87% of top-tier companies skip your profile. All shown below are ✓ earned.</div>
        <div className="badge-grid">
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico aadhaar">🆔</div>
            <div className="badge-name">Aadhaar Verified</div>
            <div className="badge-sub">UIDAI live check · Fraud-proof identity</div>
            <span className="badge-value">100% Required</span>
          </div>
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico cpc">CPC</div>
            <div className="badge-name">AAPC CPC</div>
            <div className="badge-sub">Certified Professional Coder · Active</div>
            <span className="badge-value">92% Companies</span>
          </div>
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico assessment">🧪</div>
            <div className="badge-name">Assessment Silver+</div>
            <div className="badge-sub">74/100 · Talentera-Proctored</div>
            <span className="badge-value">78% Companies</span>
          </div>
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico livechart">💻</div>
            <div className="badge-name">Live Chart Silver+</div>
            <div className="badge-sub">141 charts · 83% accuracy</div>
            <span className="badge-value">94% Companies</span>
          </div>
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico video">🎤</div>
            <div className="badge-name">Video Pitch Silver+</div>
            <div className="badge-sub">78/100 · Communication verified</div>
            <span className="badge-value">89% Companies</span>
          </div>
          <div className="badge earned priority">
            <div className="badge-crown">👑</div>
            <div className="badge-verified">✓</div>
            <div className="badge-ico academy">🎓</div>
            <div className="badge-name">Academy Sign-Off</div>
            <div className="badge-sub">Apex Institute · Verified alumni</div>
            <span className="badge-value">73% Companies</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico gold-medal">🥇</div>
            <div className="badge-name">Gold Live Chart</div>
            <div className="badge-sub">Add 60 more charts to unlock</div>
            <span className="badge-value locked-tag">55% Companies</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico digilocker">🇺🇸</div>
            <div className="badge-name">HIPAA Compliance</div>
            <div className="badge-sub">Required for US-facing roles</div>
            <span className="badge-value locked-tag">62% Companies</span>
          </div>
        </div>
      </div>

      
      <div className="badge-section">
        <div className="badge-sec-title">
          🏆 Talentera Achievements · Standard Badges
          <span className="badge-sec-tag regular">GOLD-TIER</span>
        </div>
        <div className="badge-sec-sub">Additional certifications and skill badges you've earned. Not required but boost your visibility to specialized companies.</div>
        <div className="badge-grid">
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico crc">CRC</div>
            <div className="badge-name">AAPC CRC</div>
            <div className="badge-sub">Risk Adjustment Coder</div>
            <span className="badge-value regular">Specialty</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico cdc">CDC</div>
            <div className="badge-name">AAPC CDC</div>
            <div className="badge-sub">Dental Coder · Bonus market</div>
            <span className="badge-value regular">Specialty</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico pan">📇</div>
            <div className="badge-name">PAN Verified</div>
            <div className="badge-sub">Tax-ready · Salary account eligible</div>
            <span className="badge-value regular">Onboarding</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico digilocker">📜</div>
            <div className="badge-name">DigiLocker Linked</div>
            <div className="badge-sub">Marksheets auto-verified</div>
            <span className="badge-value regular">Verified</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico skill">🎯</div>
            <div className="badge-name">Attention to Detail</div>
            <div className="badge-sub">Assessment verified</div>
            <span className="badge-value regular">Soft Skill</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico skill">🧠</div>
            <div className="badge-name">Analytical Thinking</div>
            <div className="badge-sub">Aptitude 78+</div>
            <span className="badge-value regular">Soft Skill</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico skill">🗣</div>
            <div className="badge-name">Communication</div>
            <div className="badge-sub">Video Pitch verified</div>
            <span className="badge-value regular">Soft Skill</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico assessment">🥇</div>
            <div className="badge-name">Gold Assessment</div>
            <div className="badge-sub">Score 80+ on retake</div>
            <span className="badge-value locked-tag">Upgrade</span>
          </div>
        </div>
      </div>

      
      <div className="badge-section">
        <div className="badge-sec-title">
          ✨ Special Achievements
          <span className="badge-sec-tag achievement">LIFETIME</span>
        </div>
        <div className="badge-sec-sub">Recognition badges for community engagement, milestones, and rare accomplishments. Bragging rights, not company filters.</div>
        <div className="badge-grid">
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico special">🌟</div>
            <div className="badge-name">Founding Member</div>
            <div className="badge-sub">First 1000 Talentera users</div>
            <span className="badge-value regular">Rare</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico special">💯</div>
            <div className="badge-name">100 Charts Club</div>
            <div className="badge-sub">Live coding milestone</div>
            <span className="badge-value regular">Milestone</span>
          </div>
          <div className="badge earned">
            <div className="badge-verified">✓</div>
            <div className="badge-ico special">🌏</div>
            <div className="badge-name">Multilingual</div>
            <div className="badge-sub">English + Malayalam Video</div>
            <span className="badge-value regular">Bonus</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico special">🏔</div>
            <div className="badge-name">500 Charts Club</div>
            <div className="badge-sub">Elite tier</div>
            <span className="badge-value locked-tag">Elite</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico special">📚</div>
            <div className="badge-name">Learning Streak 30</div>
            <div className="badge-sub">30 days continuous learning</div>
            <span className="badge-value locked-tag">Habit</span>
          </div>
          <div className="badge locked">
            <div className="badge-ico special">🎓</div>
            <div className="badge-name">Mentor Badge</div>
            <div className="badge-sub">Help 5 juniors after Y2</div>
            <span className="badge-value locked-tag">Community</span>
          </div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'documents' && (
<div className="page active" id="page-documents">
      <div className="page-head">
        <div className="page-eyebrow">Your verified document vault · single source of truth</div>
        <h1 className="page-title">My Documents</h1>
        <p className="page-sub">All your documents organized in 4 folders. Companies view your Verified Documents card here.</p>
      </div>

      <div className="doc-folders">
        <div className="doc-folder active"><div className="doc-folder-ico">🆔</div><div className="doc-folder-name">Identity</div><div className="doc-folder-count">4 / 4 uploaded</div></div>
        <div className="doc-folder"><div className="doc-folder-ico">🎓</div><div className="doc-folder-name">Education</div><div className="doc-folder-count">5 / 6 uploaded</div></div>
        <div className="doc-folder"><div className="doc-folder-ico">🏆</div><div className="doc-folder-name">Certifications</div><div className="doc-folder-count">3 / 3 uploaded</div></div>
        <div className="doc-folder"><div className="doc-folder-ico">💼</div><div className="doc-folder-name">Employment</div><div className="doc-folder-count">Unlocks after joining</div></div>
      </div>

      <div className="doc-list">
        <div className="doc-item"><div className="doc-file-ico">📄</div><div className="doc-info"><div className="name">Aadhaar Card (Front + Back)</div><div className="meta">PDF · 2.4 MB · Uploaded 4 Sep 2026 · UIDAI-verified</div></div><span className="doc-badge">✓ Verified</span><span className="doc-btn" onClick={() => triggerToast("Opening PDF viewer")}>View →</span></div>
        <div className="doc-item"><div className="doc-file-ico">📇</div><div className="doc-info"><div className="name">PAN Card</div><div className="meta">JPG · 890 KB · Uploaded 5 Sep 2026 · Auto-verified</div></div><span className="doc-badge">✓ Verified</span><span className="doc-btn" onClick={() => triggerToast("Opening PDF viewer")}>View →</span></div>
        <div className="doc-item"><div className="doc-file-ico">📷</div><div className="doc-info"><div className="name">Passport-size Photo</div><div className="meta">PNG · 340 KB · Uploaded 5 Sep 2026 · Face-matched to Aadhaar</div></div><span className="doc-badge">✓ Matched</span><span className="doc-btn" onClick={() => triggerToast("Opening image viewer")}>View →</span></div>
        <div className="doc-item"><div className="doc-file-ico">✍</div><div className="doc-info"><div className="name">Signature Specimen</div><div className="meta">PNG · 45 KB · Uploaded 6 Sep 2026</div></div><span className="doc-badge">✓ Saved</span><span className="doc-btn" onClick={() => triggerToast("Opening image viewer")}>View →</span></div>
      </div>
    </div>
)}

          {activeTab === 'resumes' && (
<div className="page active" id="page-resumes">
      <div className="page-head">
        <div className="page-eyebrow">Auto-built from your verified stages · Always current</div>
        <h1 className="page-title">My Resumes</h1>
        <p className="page-sub">3 templates ready. Update any stage → all resumes refresh automatically. Share live URL instead of static PDFs for 3× more shortlists.</p>
      </div>

      <div className="resume-grid">
        <div className="resume-card current" style={{"position":"relative"}}>
          <span className="resume-current-badge">CURRENT</span>
          <div className="resume-thumb">
            <div className="stripe"><div className="name"></div><div className="title"></div></div>
            <div className="body-line gold"></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
            <div className="body-line med"></div>
            <div className="body-line gold"></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
            <div className="body-line gold"></div>
            <div className="body-line long"></div>
            <div className="body-line med"></div>
          </div>
          <div className="resume-info">
            <div className="resume-name">🎯 Fresher Modern</div>
            <div className="resume-sub">Auto-picked · Silver profile · Updated today</div>
          </div>
          <div className="resume-actions">
        <button className="resume-action gold" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }}>📄 PDF</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); handleDownloadDocx(); }}>📝 DOCX</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); copyLiveResumeUrl(); }}>🔗 Live URL</button>
      </div>
        </div>

        <div className="resume-card">
          <div className="resume-thumb">
            <div className="stripe" style={{"background":"#333"}}><div className="name" style={{"background":"#ddd"}}></div><div className="title"></div></div>
            <div className="body-line gold" style={{"background":"#999"}}></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
            <div className="body-line med"></div>
            <div className="body-line gold" style={{"background":"#999"}}></div>
            <div className="body-line long"></div>
            <div className="body-line med"></div>
          </div>
          <div className="resume-info">
            <div className="resume-name">📋 Fresher Classic</div>
            <div className="resume-sub">ATS-safe · Traditional layout · Used for R1 RCM app</div>
          </div>
          <div className="resume-actions">
        <button className="resume-action gold" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }}>📄 PDF</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); handleDownloadDocx(); }}>📝 DOCX</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); copyLiveResumeUrl(); }}>🔗 Live URL</button>
      </div>
        </div>

        <div className="resume-card">
          <div className="resume-thumb">
            <div className="stripe" style={{"background":"#7C3AED"}}><div className="name"></div><div className="title"></div></div>
            <div className="body-line gold" style={{"background":"#7C3AED"}}></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
            <div className="body-line med"></div>
            <div className="body-line gold" style={{"background":"#7C3AED"}}></div>
            <div className="body-line long"></div>
            <div className="body-line long"></div>
          </div>
          <div className="resume-info">
            <div className="resume-name">🦷 Specialty (Dental)</div>
            <div className="resume-sub">For CDC roles · Used for GeBBS Dental app</div>
          </div>
          <div className="resume-actions">
        <button className="resume-action gold" onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }}>📄 PDF</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); handleDownloadDocx(); }}>📝 DOCX</button>
        <button className="resume-action" onClick={(e) => { e.stopPropagation(); copyLiveResumeUrl(); }}>🔗 Live URL</button>
      </div>
        </div>
      </div>
    
    <div className="resume-preview-container" style={{"marginTop":"28px"}}>
      <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"14px","flexWrap":"wrap","gap":"10px"}}>
        <h3 style={{"margin":"0","fontSize":"18px","color":"var(--navy, #0F1B3D)"}}>
          Live Stage 7 Verified Resume Preview
        </h3>
        <div style={{"display":"flex","gap":"8px"}}>
          <button className="btn btn-primary btn-sm" style={{"background":"#0F1B3D","color":"#F5B41A","border":"none","padding":"8px 16px","borderRadius":"8px","fontWeight":"700","cursor":"pointer"}} onClick={handleDownloadPdf}>
            📥 Download PDF
          </button>
          <button className="btn btn-secondary btn-sm" style={{"background":"#F8FAFC","border":"1.5px solid #CBD5E1","padding":"8px 16px","borderRadius":"8px","fontWeight":"600","cursor":"pointer"}} onClick={handleDownloadDocx}>
            💾 Save Word / Text
          </button>
        </div>
      </div>

      <div id="printable-resume-sheet" className="resume-sheet">
        <div className="resume-sheet-header">
          <div className="resume-header-left">
            <h1>{candidateName}</h1>
            <div className="resume-candidate-title">
              {profile?.stage5?.preferredRoles || profile?.stage3?.designation || profile?.stage7?.roleTitle || 'Talentera Verified Candidate'}
            </div>
            <div className="resume-contact-inline">
              <span>📧 {candidateEmail}</span>
              {candidatePhone && <span>📱 {candidatePhone}</span>}
              <span>📍 {profile?.stage1?.city || profile?.city || 'India'}</span>
              {profile?.stage6?.videoUrl && <span>🎥 Video Pitch Verified</span>}
            </div>
          </div>
          <div className="resume-verified-badge-pill">
            <div className="badge-top">
              🛡️ TALENTERA VERIFIED
            </div>
            <div className="badge-sub">
              ID: TLN-{profile?._id ? profile._id.slice(-6).toUpperCase() : 'AUTH'}
            </div>
          </div>
        </div>

        <div className="resume-section">
          <div className="resume-section-title">Career Objective & Professional Summary</div>
          <div className="resume-section-content">
            <p>
              {profile?.stage7?.objective ||
               profile?.stage7?.summary ||
               profile?.stage1?.summary ||
               'Motivated professional with verified credentials, domain knowledge, and strong problem-solving skills seeking high-growth opportunities with leading employers.'}
            </p>
          </div>
        </div>

        <div className="resume-section">
          <div className="resume-section-title">Academic & Educational Background</div>
          <div className="resume-section-content">
            <div className="resume-timeline-item">
              <div className="timeline-item-head">
                <span className="timeline-role">{profile?.stage2?.degree || 'Bachelor Degree'} {profile?.stage2?.branch ? '- ' + profile.stage2.branch : ''}</span>
                <span className="timeline-date">{profile?.stage2?.gradYear || 'Graduated'}</span>
              </div>
              <div className="timeline-company">{profile?.stage2?.college || 'University / Institution'}</div>
              {profile?.stage2?.cgpa && (
                <p style={{"marginTop":"4px","fontSize":"13px"}}>Score / CGPA: <strong>{profile.stage2.cgpa}</strong></p>
              )}
            </div>
          </div>
        </div>

        <div className="resume-section">
          <div className="resume-section-title">Work Experience & Internships</div>
          <div className="resume-section-content">
            {profile?.stage3?.company ? (
              <div className="resume-timeline-item">
                <div className="timeline-item-head">
                  <span className="timeline-role">{profile.stage3.designation || 'Specialist / Trainee'}</span>
                  <span className="timeline-date">{profile.stage3.experienceYears ? profile.stage3.experienceYears + ' Years' : 'Internship'}</span>
                </div>
                <div className="timeline-company">{profile.stage3.company}</div>
                {profile.stage3.responsibilities && (
                  <p style={{"marginTop":"6px"}}>{profile.stage3.responsibilities}</p>
                )}
              </div>
            ) : (
              <p style={{"color":"#64748B","fontStyle":"italic"}}>
                Fresher with verified project credentials, domain assessments, and foundational training.
              </p>
            )}
          </div>
        </div>

        <div className="resume-section">
          <div className="resume-section-title">Core Competencies & Skills</div>
          <div className="resume-section-content">
            <div className="resume-skills-cloud">
              {Array.isArray(profile?.stage4?.skills) && profile.stage4.skills.length > 0 ? (
                profile.stage4.skills.map((skill, sIdx) => (
                  <span key={sIdx} className="resume-skill-chip">{skill}</span>
                ))
              ) : (
                <>
                  <span className="resume-skill-chip">Domain Knowledge</span>
                  <span className="resume-skill-chip">Problem Solving</span>
                  <span className="resume-skill-chip">Data Analysis</span>
                  <span className="resume-skill-chip">Communication</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="resume-footer-watermark">
          <span>Talentera Verified Candidate · Single Source of Truth</span>
          <span>Cryptographic Verification Code: TLN-AUTH-{profile?._id ? profile._id.slice(-8).toUpperCase() : 'OK'}</span>
        </div>
      </div>
    </div>
    </div>
)}

          {activeTab === 'companies' && (
<div className="page active" id="page-companies">
      <div className="page-head">
        <div className="page-eyebrow">Every company · Every interview · Every outcome</div>
        <h1 className="page-title">My Companies</h1>
        <p className="page-sub">7 companies tracked · 2 offers received · Best CTC ₹6.8 LPA. Only YOU see feedback details — other companies see anonymized aggregate.</p>
      </div>

      <div className="co-pipeline">
        <div className="co-pipe-stage"><div className="count">7</div><div className="lbl">Applied</div></div>
        <div className="co-pipe-stage"><div className="count">5</div><div className="lbl">Shortlisted</div></div>
        <div className="co-pipe-stage active"><div className="count">3</div><div className="lbl">Interviewing</div></div>
        <div className="co-pipe-stage hold"><div className="count">1</div><div className="lbl">On Hold</div></div>
        <div className="co-pipe-stage selected"><div className="count">2</div><div className="lbl">Selected</div></div>
        <div className="co-pipe-stage rejected"><div className="count">1</div><div className="lbl">Rejected</div></div>
      </div>

      <div className="co-list">
        <div className="co-row" onClick={() => triggerToast("Opening Optum details")}>
          <div className="co-logo clr-optum">O</div>
          <div className="co-info"><div className="name">Optum India · HCC Coder</div><div className="role">Hyderabad · Onsite · 5.5 – 7.0 LPA</div><div className="timeline">Applied 4 Sep · Shortlisted 6 Sep · Round 2 cleared 12 Sep · Final 19 Sep</div></div>
          <div className="co-status selected">✓ OFFER · ₹6.8 LPA</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Opening offer letter')"); } catch(e){} }}>Accept →</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Opening Access details")}>
          <div className="co-logo clr-access">A</div>
          <div className="co-info"><div className="name">Access Healthcare · E/M Team</div><div className="role">Chennai · Hybrid · 6.0 – 8.5 LPA</div><div className="timeline">Applied 6 Sep · Shortlisted 8 Sep · HR round 21 Sep · 11 AM</div></div>
          <div className="co-status interviewed">🔵 HR Sep 21</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Opening prep guide')"); } catch(e){} }}>Prep →</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Opening R1 details")}>
          <div className="co-logo clr-r1">R1</div>
          <div className="co-info"><div className="name">R1 RCM · Enterprise HCC</div><div className="role">Hyderabad · Onsite · 6.5 – 8.5 LPA</div><div className="timeline">Applied 8 Sep · Shortlisted 10 Sep · Awaiting technical round</div></div>
          <div className="co-status shortlisted">🟡 Shortlisted</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Opening slot picker')"); } catch(e){} }}>Book →</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Opening Omega details")}>
          <div className="co-logo clr-omega">Ω</div>
          <div className="co-info"><div className="name">Omega Healthcare · US Night Shift</div><div className="role">Bengaluru · Onsite · 5.5 – 7.5 LPA</div><div className="timeline">Applied 10 Sep · Interview 14 Sep · Offer 15 Sep</div></div>
          <div className="co-status selected">✓ OFFER · ₹6.2 LPA</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Opening offer letter')"); } catch(e){} }}>View →</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Opening Cognizant details")}>
          <div className="co-logo clr-cognizant">C</div>
          <div className="co-info"><div className="name">Cognizant · AR Team</div><div className="role">Hyderabad · Remote · 5.0 – 7.0 LPA</div><div className="timeline">Applied 11 Sep · Round 1 done · Feedback pending</div></div>
          <div className="co-status hold">🟠 On Hold</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Follow-up email sent')"); } catch(e){} }}>Follow up</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Opening GeBBS details")}>
          <div className="co-logo clr-gebbs">GD</div>
          <div className="co-info"><div className="name">GeBBS Dental · CDC Coder</div><div className="role">Mumbai · Onsite · 5.0 – 7.0 LPA · Dental</div><div className="timeline">Applied 12 Sep · Awaiting response</div></div>
          <div className="co-status applied">⚪ Applied</div>
          <button className="co-cta-btn" onClick={() => { try { triggerToast("event.stopPropagation();toast('Company info opened')"); } catch(e){} }}>View</button>
        </div>
        <div className="co-row" onClick={() => triggerToast("Feedback: CTC mismatch")}>
          <div className="co-logo clr-cognizant">M</div>
          <div className="co-info"><div className="name">Multiplier Health · HCC Trainee</div><div className="role">Kochi · Onsite · 3.5 – 4.5 LPA · Trainee</div><div className="timeline">Applied 8 Sep · Rejected 11 Sep · Reason: CTC mismatch</div></div>
          <div className="co-status rejected">✕ Not Selected</div>
          <button className="co-cta-btn" style={{"background":"var(--gray-soft)","color":"var(--gray-mute)"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Full feedback opened')"); } catch(e){} }}>Feedback</button>
        </div>
      </div>
    </div>
)}

          {activeTab === 'applications' && (
<div className="page active" id="page-applications">
      <div className="page-head">
        <div className="page-eyebrow">Application timeline</div>
        <h1 className="page-title">My Applications</h1>
        <p className="page-sub">Every application you've submitted or been auto-matched to. 7 total · 3 new this week.</p>
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
        <p className="page-sub">2 pending confirmations. Confirm within 24 hrs to hold your slot.</p>
      </div>
      <div className="co-list">
        <div className="co-row"><div className="co-logo clr-optum">O</div>
          <div className="co-info"><div className="name">Optum · Final Round</div><div className="role">Video call · 60 min · Panel of 3</div><div className="timeline">19 Sep 2026 · 3:00 PM IST</div></div>
          <div className="co-status shortlisted">🟡 Pending</div>
          <button className="co-cta-btn" onClick={() => triggerToast("Slot confirmed. Calendar invite sent.")}>✓ Confirm</button>
        </div>
        <div className="co-row"><div className="co-logo clr-access">A</div>
          <div className="co-info"><div className="name">Access Healthcare · HR Round</div><div className="role">In-person · 45 min · Chennai office</div><div className="timeline">21 Sep 2026 · 11:00 AM IST</div></div>
          <div className="co-status shortlisted">🟡 Pending</div>
          <button className="co-cta-btn" onClick={() => triggerToast("Slot confirmed. Calendar invite sent.")}>✓ Confirm</button>
        </div>
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
        <div style={{"marginBottom":"14px"}}><b style={{"color":"var(--navy)"}}>Optum India · Round 2 · 12 Sep</b>
          <div style={{"background":"#FAFAF7","borderLeft":"3px solid var(--gold)","padding":"10px 14px","borderRadius":"0 8px 8px 0","marginTop":"6px","fontStyle":"italic","color":"var(--gray-txt)","fontSize":"13px"}}>"Strong on HCC and specialty depth. Confidence in delivery needs work — try mock interviews. Would recommend for next round."</div>
        </div>
        <div style={{"marginBottom":"14px"}}><b style={{"color":"var(--navy)"}}>Access Healthcare · Round 1 · 8 Sep</b>
          <div style={{"background":"#FAFAF7","borderLeft":"3px solid var(--gold)","padding":"10px 14px","borderRadius":"0 8px 8px 0","marginTop":"6px","fontStyle":"italic","color":"var(--gray-txt)","fontSize":"13px"}}>"Great specialty fit. Budget aligned. Moving forward to HR round."</div>
        </div>
        <div><b style={{"color":"var(--navy)"}}>Multiplier Health · Round 1 · 11 Sep</b>
          <div style={{"background":"#FAFAF7","borderLeft":"3px solid var(--red)","padding":"10px 14px","borderRadius":"0 8px 8px 0","marginTop":"6px","fontStyle":"italic","color":"var(--gray-txt)","fontSize":"13px"}}>"Skills good, but candidate's expected CTC (₹5 LPA) exceeds our fresher trainee budget (₹3.5-4.5 LPA). Not proceeding."</div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'jobs' && (
<div className="page active" id="page-jobs">
      <div className="page-head">
        <div className="page-eyebrow">Live · 380 open roles across 47 RCM companies · Updated 2 min ago</div>
        <h1 className="page-title">Browse Jobs · Everything Medical Coding</h1>
        <p className="page-sub">All open roles, all locations, all companies — in ONE place. No jumping to Naukri, Foundit, or LinkedIn. Filter, view full JD, and apply directly with your verified profile.</p>
      </div>

      
      <div className="quick-stats" style={{"marginBottom":"18px"}}>
        <div className="qs-card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFFDF5)","borderColor":"var(--gold)"}}><div className="qs-ico gold">🔥</div><div><div className="qs-val">380</div><div className="qs-lbl">Live Openings</div><div className="qs-trend">↑ 12 new today</div></div></div>
        <div className="qs-card"><div className="qs-ico blue">🏢</div><div><div className="qs-val">47</div><div className="qs-lbl">Companies Hiring</div><div className="qs-trend">↑ 3 new this week</div></div></div>
        <div className="qs-card"><div className="qs-ico green">🎯</div><div><div className="qs-val">142</div><div className="qs-lbl">Matching Your Profile</div><div className="qs-trend">Your Silver tier qualifies</div></div></div>
        <div className="qs-card"><div className="qs-ico purple">📍</div><div><div className="qs-val">17</div><div className="qs-lbl">Cities Hiring Now</div><div className="qs-trend">Pan-India + Global</div></div></div>
      </div>

      
      <div className="card" style={{"background":"linear-gradient(135deg,var(--navy),#1E3A8A)","color":"var(--white)","padding":"22px 24px"}}>
        <div style={{"display":"flex","alignItems":"center","justifyContent":"space-between","marginBottom":"14px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"10px"}}>
            <div style={{"width":"32px","height":"32px","background":"var(--gold)","color":"var(--navy)","borderRadius":"10px","display":"grid","placeItems":"center","fontSize":"15px"}}>🎛</div>
            <div style={{"fontSize":"15px","fontWeight":"800"}}>Filter Jobs · Only in Talentera</div>
          </div>
          <button onClick={() => triggerToast("All filters cleared")} style={{"background":"transparent","color":"var(--gold)","fontSize":"12px","fontWeight":"800","cursor":"pointer","padding":"6px 12px","border":"1px solid rgba(245,180,26,.3)","borderRadius":"8px"}}>Reset all</button>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(6,1fr)","gap":"10px","marginBottom":"12px"}}>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>📍 Location</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>All India (17 cities)</option>
              <option>Bengaluru (48 jobs)</option>
              <option>Hyderabad (72 jobs)</option>
              <option>Chennai (55 jobs)</option>
              <option>Mumbai (34 jobs)</option>
              <option>Pune (28 jobs)</option>
              <option>Delhi-NCR (22 jobs)</option>
              <option>Kochi (18 jobs)</option>
              <option>Coimbatore (15 jobs)</option>
              <option>Vizag (12 jobs)</option>
              <option>Remote (38 jobs)</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>🩺 Specialty</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>All Specialties</option>
              <option>HCC · Risk Adjustment (68 jobs)</option>
              <option>E/M Coding (54 jobs)</option>
              <option>ED Coding (38 jobs)</option>
              <option>Surgery (29 jobs)</option>
              <option>IP-DRG (24 jobs)</option>
              <option>Home Health · HCS-D (18 jobs)</option>
              <option>Dental · CDC (16 jobs)</option>
              <option>AR Calling (42 jobs)</option>
              <option>Denials Mgmt (28 jobs)</option>
              <option>Radiology (12 jobs)</option>
              <option>Pathology (8 jobs)</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>🏢 Company</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>All Companies (47)</option>
              <option>Optum India (12 roles)</option>
              <option>Access Healthcare (8)</option>
              <option>R1 RCM (11)</option>
              <option>Cognizant (14)</option>
              <option>Omega Healthcare (9)</option>
              <option>GeBBS Healthcare (7)</option>
              <option>Sutherland (8)</option>
              <option>WNS Healthcare (6)</option>
              <option>Coronis Health (5)</option>
              <option>AGS Health (10)</option>
              <option>Ventra Health (6)</option>
              <option>Vee Technologies (5)</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>📋 Project / Client</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>All Projects</option>
              <option>UnitedHealthcare</option>
              <option>Anthem BCBS</option>
              <option>Aetna</option>
              <option>Humana</option>
              <option>Cigna</option>
              <option>Kaiser Permanente</option>
              <option>Medicare Advantage</option>
              <option>US Physician Offices</option>
              <option>US Hospitals</option>
              <option>UK NHS</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>💰 Salary Band</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>Any</option>
              <option>Trainee ₹2.5-3.5 LPA</option>
              <option>Fresher ₹3.5-5.0 LPA</option>
              <option>Fresher+ ₹5.0-7.0 LPA</option>
              <option>Junior ₹7.0-9.0 LPA</option>
              <option>Mid ₹9.0-12.0 LPA</option>
              <option>Senior ₹12+ LPA</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"10px","color":"var(--gold)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>🏢 Work Mode</label>
            <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","background":"rgba(255,255,255,.1)","color":"var(--white)","border":"1px solid rgba(255,255,255,.15)","borderRadius":"8px","padding":"9px 10px","fontSize":"12px","cursor":"pointer"}}>
              <option>Any</option>
              <option>Onsite (245)</option>
              <option>Hybrid (97)</option>
              <option>Remote (38)</option>
              <option>Day Shift</option>
              <option>US Night Shift</option>
              <option>UK Evening Shift</option>
              <option>Rotational</option>
            </select>
          </div>
        </div>

        <div style={{"display":"flex","flexWrap":"wrap","gap":"8px","marginTop":"8px"}}>
          <span style={{"background":"var(--gold)","color":"var(--navy)","padding":"4px 10px","borderRadius":"12px","fontSize":"11px","fontWeight":"800","display":"inline-flex","alignItems":"center","gap":"6px"}}>🎯 Match my profile <span style={{"opacity":".5","cursor":"pointer"}} onClick={() => triggerToast("Filter removed")}>✕</span></span>
          <span style={{"background":"rgba(255,255,255,.15)","color":"var(--white)","padding":"4px 10px","borderRadius":"12px","fontSize":"11px","fontWeight":"800","cursor":"pointer"}} onClick={() => triggerToast("Filter added")}>+ Verified Silver+ only</span>
          <span style={{"background":"rgba(255,255,255,.15)","color":"var(--white)","padding":"4px 10px","borderRadius":"12px","fontSize":"11px","fontWeight":"800","cursor":"pointer"}} onClick={() => triggerToast("Filter added")}>+ Featured only</span>
          <span style={{"background":"rgba(255,255,255,.15)","color":"var(--white)","padding":"4px 10px","borderRadius":"12px","fontSize":"11px","fontWeight":"800","cursor":"pointer"}} onClick={() => triggerToast("Filter added")}>+ Walk-in / Immediate</span>
          <span style={{"background":"rgba(255,255,255,.15)","color":"var(--white)","padding":"4px 10px","borderRadius":"12px","fontSize":"11px","fontWeight":"800","cursor":"pointer"}} onClick={() => triggerToast("Filter added")}>+ Open to Global</span>
        </div>
      </div>

      
      <div className="sec" style={{"marginTop":"20px"}}>
        <div className="sec-head">
          <div className="sec-title"><div className="mod-ico">🗺</div>Live Hiring Map — cities & company counts <span className="count">17 CITIES ACTIVE</span></div>
          <span className="sec-more" onClick={() => triggerToast("Opening full map view")}>View interactive map →</span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(6,1fr)","gap":"10px"}}>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Hyderabad — 72 jobs")} style={{"cursor":"pointer","background":"linear-gradient(135deg,#FFFDF5,var(--gold-pale))","borderColor":"var(--gold)"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🏙</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Hyderabad</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>72 jobs · 15 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>🔥 Highest hiring</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Chennai — 55 jobs")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🏙</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Chennai</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>55 jobs · 11 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>📈 +8 this week</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Bengaluru — 48 jobs")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🌆</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Bengaluru</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>48 jobs · 10 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>🏠 Your city</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Remote — 38 jobs")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🌐</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Remote</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>38 jobs · 9 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>🏡 Work from home</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Mumbai — 34 jobs")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🏙</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Mumbai</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>34 jobs · 8 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>Dental-heavy</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Pune — 28 jobs")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"22px"}}>🌆</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Pune</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","marginTop":"2px"}}>28 jobs · 6 companies</div><div style={{"fontSize":"10px","color":"var(--gray-mute)","marginTop":"2px"}}>Growing hub</div></div></div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(6,1fr)","gap":"10px","marginTop":"10px"}}>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Delhi-NCR")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🏙</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Delhi-NCR</div><div style={{"fontSize":"10.5px","color":"var(--gold-deep)","fontWeight":"800"}}>22 jobs</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Kochi")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🌴</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Kochi</div><div style={{"fontSize":"10.5px","color":"var(--gold-deep)","fontWeight":"800"}}>18 jobs</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Coimbatore")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🌴</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Coimbatore</div><div style={{"fontSize":"10.5px","color":"var(--gold-deep)","fontWeight":"800"}}>15 jobs</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Vizag")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🏖</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Vizag</div><div style={{"fontSize":"10.5px","color":"var(--gold-deep)","fontWeight":"800"}}>12 jobs</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Trivandrum")} style={{"cursor":"pointer"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🌴</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Trivandrum</div><div style={{"fontSize":"10.5px","color":"var(--gold-deep)","fontWeight":"800"}}>10 jobs</div></div></div>
          <div className="qs-card" onClick={() => triggerToast("Filtered by Global roles")} style={{"cursor":"pointer","background":"linear-gradient(135deg,var(--blue-soft),#F5F8FF)"}}><div style={{"textAlign":"center","width":"100%"}}><div style={{"fontSize":"20px"}}>🌍</div><div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginTop":"3px"}}>Global (US·UAE)</div><div style={{"fontSize":"10.5px","color":"var(--blue)","fontWeight":"800"}}>28 jobs</div></div></div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title"><div className="mod-ico">🏢</div>Company Directory · Live Hiring Status <span className="count">47 COMPANIES · 380 JOBS</span></div>
          <span className="sec-more" onClick={() => triggerToast("Opening full directory")}>View all 47 →</span>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"repeat(3,1fr)","gap":"12px"}}>
          
          <div className="card" onClick={() => triggerToast("Opening Optum full profile + 12 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-optum">O</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Optum India</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Hyderabad · 40,000+ employees</div></div>
              <span style={{"background":"var(--red)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>🔥 HOT</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>UnitedHealth Group's RCM arm. Serves major US payers. Silver-tier tech stack (EPIC + 3M 360).</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>12 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹5.5 – 8.5 LPA</span></div>
          </div>

          
          <div className="card" onClick={() => triggerToast("Opening Access Healthcare + 8 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-access">A</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Access Healthcare</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Chennai · 18,000+ employees</div></div>
              <span style={{"background":"var(--gold)","color":"var(--navy)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>FEATURED</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>RCM services + payment integrity. Handles $70B annualized net collections for US healthcare providers.</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>8 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹6.0 – 9.5 LPA</span></div>
          </div>

          
          <div className="card" onClick={() => triggerToast("Opening R1 RCM + 11 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-r1">R1</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>R1 RCM India</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Hyderabad · 15,000+ employees</div></div>
              <span style={{"background":"var(--red)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>🔥 HOT</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>Enterprise RCM. Handles hospital + physician billing. NYSE-listed. Best for candidates wanting large-scale exposure.</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>11 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹5.5 – 8.5 LPA</span></div>
          </div>

          
          <div className="card" onClick={() => triggerToast("Opening Cognizant + 14 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-cognizant">C</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Cognizant TriZetto</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Multi-city · 3,50,000 employees</div></div>
              <span style={{"background":"var(--blue)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>🌐 REMOTE</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>RCM automation + AI-based coding. Best for tech-savvy coders. Remote roles available.</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>14 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹5.0 – 7.5 LPA</span></div>
          </div>

          
          <div className="card" onClick={() => triggerToast("Opening Omega + 9 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-omega">Ω</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Omega Healthcare</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Bengaluru · 25,000+ employees</div></div>
              <span style={{"background":"var(--purple)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>🌙 US NIGHT</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>US-facing RCM services. E/M + AR heavy. Best for candidates open to US night shift with premium salary.</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>9 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹5.5 – 7.5 LPA</span></div>
          </div>

          
          <div className="card" onClick={() => triggerToast("Opening GeBBS Dental + 7 open roles")} style={{"cursor":"pointer","marginBottom":"0","padding":"16px 18px","transition":".15s"}} onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"12px"}}>
              <div className="co-logo clr-gebbs">GD</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>GeBBS Healthcare</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Mumbai · 8,000+ employees</div></div>
              <span style={{"background":"#EC4899","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"9.5px","fontWeight":"800"}}>🦷 DENTAL</span>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5","marginBottom":"8px"}}>Specialty RCM including dental (CDT codes) and behavioral health. Best for CDC-certified coders.</div>
            <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}><span style={{"color":"var(--gold-deep)","fontWeight":"800"}}>7 open roles</span><span style={{"color":"var(--gray-mute)"}}>₹5.0 – 7.0 LPA</span></div>
          </div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title"><div className="mod-ico">💼</div>Live Job Postings · Apply directly · 1-click <span className="count priority">142 MATCH YOU</span></div>
          <span className="sec-more" onClick={() => triggerToast("Sorted by best match")}>Sort: Best match ↓</span>
        </div>

        
        <div className="card" style={{"marginBottom":"12px","padding":"20px 22px","borderLeft":"4px solid var(--gold)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"16px","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","flex":"1"}}>
              <div className="co-logo clr-optum" style={{"width":"56px","height":"56px"}}>O</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)"}}>HCC Medical Coder · Fresher-Silver+</div>
                  <span style={{"background":"var(--red)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🔥 HOT</span>
                  <span style={{"background":"var(--green)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>✓ MATCH</span>
                </div>
                <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","marginTop":"5px","display":"flex","gap":"14px","flexWrap":"wrap"}}>
                  <span>🏢 <b>Optum India</b></span>
                  <span>📍 Hyderabad · Onsite</span>
                  <span>💰 ₹5.5 – 7.0 LPA</span>
                  <span>🕐 Day + US Night rotational</span>
                  <span>📋 UnitedHealthcare Medicare Adv.</span>
                </div>
              </div>
            </div>
            <button onClick={() => triggerToast("Application sent to Optum with your verified Silver profile. HR notified.")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Apply Now</button>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","marginBottom":"12px"}}>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>CPC Required ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>HCC Specialty ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Assessment ≥ 70 ✓ (you: 74)</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Live Charts ≥ 50 ✓ (you: 141)</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Video Silver+ ✓</span>
          </div>
          <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.55","padding":"12px 14px","background":"#FAFAF7","borderRadius":"8px","marginBottom":"8px"}}>
            <b style={{"color":"var(--navy)"}}>📋 Full JD:</b> Code Medicare Advantage HCC charts using CMS V28 model. Handle 60-80 charts/day at 90%+ accuracy. Query providers for missing documentation. Weekly QA sessions with senior coders. Immediate joiners preferred. Complete training + shadowing for first 4 weeks. 12 CEUs/yr sponsored by Optum.
          </div>
          <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"var(--gray-mute)","alignItems":"center"}}>
            <div style={{"display":"flex","gap":"14px"}}><span>📅 Posted 2 days ago</span><span>👥 47 applied</span><span>⚡ Fast-track hiring · Offer in 7 days</span></div>
            <div><span style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Bookmarked')"); } catch(e){} }}>🔖 Save</span></div>
          </div>
        </div>

        
        <div className="card" style={{"marginBottom":"12px","padding":"20px 22px","borderLeft":"4px solid var(--green)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"16px","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","flex":"1"}}>
              <div className="co-logo clr-access" style={{"width":"56px","height":"56px"}}>A</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)"}}>E/M Coder · Multi-Specialty</div>
                  <span style={{"background":"var(--green)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>✓ MATCH</span>
                  <span style={{"background":"var(--blue)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🌐 HYBRID</span>
                </div>
                <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","marginTop":"5px","display":"flex","gap":"14px","flexWrap":"wrap"}}>
                  <span>🏢 <b>Access Healthcare</b></span>
                  <span>📍 Chennai · Hybrid (3 days WFH)</span>
                  <span>💰 ₹6.0 – 8.5 LPA</span>
                  <span>🕐 Day shift</span>
                  <span>📋 Anthem BCBS</span>
                </div>
              </div>
            </div>
            <button onClick={() => triggerToast("Application sent to Access Healthcare")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Apply Now</button>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","marginBottom":"12px"}}>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>CPC ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>E/M Specialty ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Assessment ≥ 65 ✓</span>
            <span style={{"background":"var(--red-soft)","color":"var(--red)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Preferred: 3+ months experience (you: fresher)</span>
          </div>
          <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.55","padding":"12px 14px","background":"#FAFAF7","borderRadius":"8px","marginBottom":"8px"}}>
            <b style={{"color":"var(--navy)"}}>📋 Full JD:</b> Code E/M visits for physician office practices. Apply 2024 MDM Grid. 50-70 charts/day at 92%+ accuracy. Hybrid 2 days Chennai office + 3 days WFH. Freshers with strong Assessment + Silver Video considered.
          </div>
          <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"var(--gray-mute)","alignItems":"center"}}>
            <div style={{"display":"flex","gap":"14px"}}><span>📅 Posted 5 days ago</span><span>👥 38 applied</span><span>🎯 Silver+ candidates prioritized</span></div>
            <div><span style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Bookmarked')"); } catch(e){} }}>🔖 Save</span></div>
          </div>
        </div>

        
        <div className="card" style={{"marginBottom":"12px","padding":"20px 22px","borderLeft":"4px solid var(--purple)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"16px","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","flex":"1"}}>
              <div className="co-logo clr-gebbs" style={{"width":"56px","height":"56px"}}>GD</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)"}}>Dental Coder (CDT) · Fresher OK</div>
                  <span style={{"background":"#EC4899","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🦷 DENTAL</span>
                  <span style={{"background":"var(--green)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>✓ CDC MATCH</span>
                </div>
                <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","marginTop":"5px","display":"flex","gap":"14px","flexWrap":"wrap"}}>
                  <span>🏢 <b>GeBBS Healthcare</b></span>
                  <span>📍 Mumbai · Onsite</span>
                  <span>💰 ₹5.0 – 7.0 LPA</span>
                  <span>🕐 Day shift</span>
                  <span>📋 US Dental Practices</span>
                </div>
              </div>
            </div>
            <button onClick={() => triggerToast("Application sent to GeBBS Dental")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Apply Now</button>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","marginBottom":"12px"}}>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>CDC Required ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>CDT Codes knowledge ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Dental Anatomy ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Freshers welcome ✓</span>
          </div>
          <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.55","padding":"12px 14px","background":"#FAFAF7","borderRadius":"8px","marginBottom":"8px"}}>
            <b style={{"color":"var(--navy)"}}>📋 Full JD:</b> Code dental procedures using CDT codes (D0100-D9999). Handle 40-60 dental charts/day. Knowledge of restorative, endodontics, periodontics, oral surgery. Prior dental exposure preferred but not required.
          </div>
          <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"var(--gray-mute)","alignItems":"center"}}>
            <div style={{"display":"flex","gap":"14px"}}><span>📅 Posted 1 day ago</span><span>👥 12 applied</span><span>🎯 CDC holders prioritized</span></div>
            <div><span style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Bookmarked')"); } catch(e){} }}>🔖 Save</span></div>
          </div>
        </div>

        
        <div className="card" style={{"marginBottom":"12px","padding":"20px 22px","borderLeft":"4px solid var(--blue)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"16px","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","flex":"1"}}>
              <div className="co-logo clr-cognizant" style={{"width":"56px","height":"56px"}}>C</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)"}}>AR Caller · Denial Management · Remote</div>
                  <span style={{"background":"var(--blue)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🌐 REMOTE</span>
                  <span style={{"background":"var(--purple)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🌙 US NIGHT</span>
                </div>
                <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","marginTop":"5px","display":"flex","gap":"14px","flexWrap":"wrap"}}>
                  <span>🏢 <b>Cognizant TriZetto</b></span>
                  <span>📍 Anywhere India · WFH</span>
                  <span>💰 ₹5.0 – 7.0 LPA + shift allowance</span>
                  <span>🕐 US Night 6:30 PM – 3:30 AM</span>
                  <span>📋 Multi-payer AR</span>
                </div>
              </div>
            </div>
            <button onClick={() => triggerToast("Application sent to Cognizant")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Apply Now</button>
          </div>
          <div style={{"display":"flex","flexWrap":"wrap","gap":"6px","marginBottom":"12px"}}>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Fluent English (spoken) ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Confidence ≥ 65 ✓ (you: 70)</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>US shift OK ✓</span>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Freshers welcome ✓</span>
          </div>
          <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.55","padding":"12px 14px","background":"#FAFAF7","borderRadius":"8px","marginBottom":"8px"}}>
            <b style={{"color":"var(--navy)"}}>📋 Full JD:</b> Call US insurance companies for AR follow-up + denial resolution. 60-80 calls per shift. Handle appeals, resubmissions. Fluent US-accent English required. Night shift allowance of ₹8,000/month over base.
          </div>
          <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"var(--gray-mute)","alignItems":"center"}}>
            <div style={{"display":"flex","gap":"14px"}}><span>📅 Posted 3 days ago</span><span>👥 82 applied</span><span>🌐 100% Remote · Home internet reimbursed</span></div>
            <div><span style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Bookmarked')"); } catch(e){} }}>🔖 Save</span></div>
          </div>
        </div>

        
        <div className="card" style={{"marginBottom":"12px","padding":"20px 22px","borderLeft":"4px solid var(--red)"}}>
          <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","gap":"16px","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px","flex":"1"}}>
              <div className="co-logo clr-r1" style={{"width":"56px","height":"56px"}}>R1</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)"}}>Junior Coder Walk-In Drive · 40 openings</div>
                  <span style={{"background":"var(--red)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>⚡ WALK-IN 20 SEP</span>
                  <span style={{"background":"var(--green)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>SAME-DAY OFFER</span>
                </div>
                <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","marginTop":"5px","display":"flex","gap":"14px","flexWrap":"wrap"}}>
                  <span>🏢 <b>R1 RCM India</b></span>
                  <span>📍 Hyderabad · HITEC City</span>
                  <span>💰 ₹4.5 – 6.5 LPA</span>
                  <span>🕐 Day + Night mix</span>
                  <span>📋 Multi-specialty</span>
                </div>
              </div>
            </div>
            <button onClick={() => triggerToast("Slot booked for 20 Sep walk-in drive. Calendar invite sent.")} style={{"background":"var(--red)","color":"var(--white)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📅 Book Walk-In</button>
          </div>
          <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.55","padding":"12px 14px","background":"#FAFAF7","borderRadius":"8px","marginBottom":"8px"}}>
            <b style={{"color":"var(--navy)"}}>📋 Full JD:</b> Mega walk-in drive at R1 Hyderabad campus, 20 Sep 2026 (Saturday, 9 AM - 4 PM). Rounds: HR + Technical + Manager. Talentera Silver+ candidates skip HR round. Bring Aadhaar + all cert originals + 2 passport photos. Same-day offer letters for selected candidates.
          </div>
          <div style={{"display":"flex","justifyContent":"space-between","fontSize":"11px","color":"var(--gray-mute)","alignItems":"center"}}>
            <div style={{"display":"flex","gap":"14px"}}><span>📅 Walk-in on 20 Sep 2026</span><span>👥 156 slots booked · 44 remaining</span><span>🎁 Joining bonus ₹15k</span></div>
            <div><span style={{"color":"var(--gold-deep)","fontWeight":"800","cursor":"pointer"}} onClick={() => { try { triggerToast("event.stopPropagation();toast('Bookmarked')"); } catch(e){} }}>🔖 Save</span></div>
          </div>
        </div>

        
        <div style={{"textAlign":"center","marginTop":"20px"}}>
          <button onClick={() => triggerToast("Loading next 20 jobs...")} style={{"background":"var(--white)","color":"var(--navy)","padding":"14px 32px","borderRadius":"12px","fontSize":"14px","fontWeight":"800","border":"2px solid var(--gold)","cursor":"pointer"}}>
            Load 20 more jobs · 137 remaining →
          </button>
          <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"10px","fontStyle":"italic"}}>💡 Talentera routes new matching roles to your WhatsApp every 24 hours. Never miss a match.</div>
        </div>
      </div>

      
      <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"1.5px solid var(--gold)","marginTop":"20px"}}>
        <div style={{"display":"grid","gridTemplateColumns":"60px 1fr","gap":"16px","alignItems":"center"}}>
          <div style={{"fontSize":"44px"}}>🎯</div>
          <div>
            <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Everything Medical Coding · One Portal · Zero Redirects</div>
            <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.6"}}>No jumping to Naukri, Foundit, LinkedIn, or WhatsApp groups. Talentera aggregates every open RCM role from every hiring company in India (+ US/UAE remote). One-click apply with your verified profile. Same-portal Application Tracker · Interview Invites · Feedback Vault · Employment History. <b>Your entire medical coding career lives here.</b></div>
          </div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'refer' && (
<div className="page active" id="page-refer">
      <div className="page-head">
        <div className="page-eyebrow">🎁 Talentera Referral Program · Earn points · Redeem cash + vouchers</div>
        <h1 className="page-title">Refer & Earn</h1>
        <p className="page-sub">Refer your friends to Talentera. Earn points as they progress. Redeem for cash, gift vouchers, free CPC exams, or Ambassador rewards. Your network becomes your income stream.</p>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,var(--navy),#1E3A8A)","color":"var(--white)","borderRadius":"18px","padding":"28px 32px","marginBottom":"20px","position":"relative","overflow":"hidden","boxShadow":"0 8px 24px rgba(15,27,61,.2)"}}>
        <div style={{"position":"absolute","right":"-60px","top":"-60px","width":"240px","height":"240px","background":"radial-gradient(circle,rgba(245,180,26,.25),transparent 60%)"}}></div>
        <div style={{"position":"absolute","left":"-40px","bottom":"-40px","width":"180px","height":"180px","background":"radial-gradient(circle,rgba(74,222,128,.15),transparent 60%)"}}></div>
        <div style={{"display":"grid","gridTemplateColumns":"1fr auto","gap":"24px","alignItems":"center","position":"relative"}}>
          <div>
            <div style={{"color":"var(--gold)","fontSize":"11px","fontWeight":"800","letterSpacing":"1.5px","textTransform":"uppercase","marginBottom":"8px"}}>🎁 Your Talentera Points Wallet</div>
            <div style={{"display":"flex","alignItems":"baseline","gap":"14px","marginBottom":"8px"}}>
              <div style={{"fontSize":"48px","fontWeight":"800","letterSpacing":"-1px"}}>3,847</div>
              <div style={{"fontSize":"14px","color":"var(--gold-pale)","fontWeight":"600"}}>points</div>
              <div style={{"fontSize":"16px","color":"var(--gold)","fontWeight":"800"}}>≈ ₹1,923 cash value</div>
            </div>
            <div style={{"display":"flex","gap":"8px","flexWrap":"wrap","marginTop":"12px"}}>
              <span style={{"background":"rgba(74,222,128,.28)","color":"#7ED87E","padding":"5px 12px","borderRadius":"20px","fontSize":"11px","fontWeight":"800"}}>↑ 200 pts this week</span>
              <span style={{"background":"rgba(245,180,26,.22)","color":"var(--gold)","padding":"5px 12px","borderRadius":"20px","fontSize":"11px","fontWeight":"800"}}>Lifetime earned: 5,247 pts</span>
              <span style={{"background":"rgba(255,255,255,.14)","color":"var(--white)","padding":"5px 12px","borderRadius":"20px","fontSize":"11px","fontWeight":"800"}}>Rank #43 in India</span>
            </div>
          </div>
          <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
            <button onClick={() => triggerToast("Redemption catalog opened")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 24px","borderRadius":"12px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","boxShadow":"0 4px 12px rgba(245,180,26,.4)"}}>🎁 Redeem Points →</button>
            <button onClick={() => triggerToast("Cash withdrawal: ₹1,923 will reach your UPI in 24 hrs")} style={{"background":"rgba(255,255,255,.14)","color":"var(--white)","padding":"10px 20px","borderRadius":"12px","fontSize":"12px","fontWeight":"800","border":"1px solid rgba(255,255,255,.2)","cursor":"pointer"}}>💰 Withdraw Cash</button>
          </div>
        </div>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"18px","padding":"24px 28px","marginBottom":"20px"}}>
        <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","marginBottom":"12px","display":"flex","alignItems":"center","gap":"10px"}}>🔗 Your Unique Referral Link</div>
        <div style={{"background":"var(--white)","border":"1.5px solid var(--gold)","borderRadius":"12px","padding":"12px 18px","display":"flex","alignItems":"center","gap":"10px","marginBottom":"14px"}}>
          <span style={{"fontFamily":"'JetBrains Mono',Menlo,monospace","fontSize":"14px","fontWeight":"800","color":"var(--navy)","flex":"1"}}>talentera.io/r/ananya-sharma</span>
          <button onClick={() => triggerToast("Link copied to clipboard")} style={{"background":"var(--navy)","color":"var(--gold)","padding":"8px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📋 Copy Link</button>
          <button onClick={() => triggerToast("QR code generated")} style={{"background":"var(--navy)","color":"var(--gold)","padding":"8px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📱 QR</button>
        </div>
        <div style={{"display":"grid","gridTemplateColumns":"repeat(4,1fr)","gap":"10px"}}>
          <button onClick={() => triggerToast("WhatsApp opened with your referral message")} style={{"background":"#25D366","color":"var(--white)","padding":"12px","borderRadius":"10px","fontSize":"12px","fontWeight":"800","border":"none","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"6px"}}>💬 WhatsApp Share</button>
          <button onClick={() => triggerToast("LinkedIn share opened")} style={{"background":"#0A66C2","color":"var(--white)","padding":"12px","borderRadius":"10px","fontSize":"12px","fontWeight":"800","border":"none","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"6px"}}>💼 LinkedIn Post</button>
          <button onClick={() => triggerToast("Email composer opened")} style={{"background":"var(--red)","color":"var(--white)","padding":"12px","borderRadius":"10px","fontSize":"12px","fontWeight":"800","border":"none","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"6px"}}>✉ Email Friends</button>
          <button onClick={() => triggerToast("Telegram share opened")} style={{"background":"#0088CC","color":"var(--white)","padding":"12px","borderRadius":"10px","fontSize":"12px","fontWeight":"800","border":"none","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"6px"}}>📢 Telegram</button>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">⚡</div>How you earn points · per referred friend</div></div>
        <div style={{"display":"grid","gridTemplateColumns":"repeat(6,1fr)","gap":"10px"}}>
          <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>📝</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800"}}>Signup</div><div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"4px"}}>+100</div></div>
          <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>🛡</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800"}}>Stage 01</div><div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"4px"}}>+100</div></div>
          <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>🧪</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800"}}>Silver Assess.</div><div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"4px"}}>+200</div></div>
          <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>💻</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800"}}>Silver Chart</div><div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"4px"}}>+200</div></div>
          <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>🚀</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800"}}>Goes Live</div><div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"4px"}}>+100</div></div>
          <div style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"12px","padding":"16px 12px","textAlign":"center"}}><div style={{"fontSize":"22px","marginBottom":"4px"}}>🎉</div><div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800"}}>First Job!</div><div style={{"fontSize":"18px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>+500</div></div>
        </div>
        <div style={{"background":"var(--navy)","color":"var(--white)","borderRadius":"12px","padding":"14px 20px","marginTop":"12px","display":"flex","alignItems":"center","justifyContent":"space-between"}}>
          <div style={{"fontSize":"13px"}}><b style={{"color":"var(--gold)"}}>Max per friend: 1,200 points ≈ ₹600.</b> Plus multipliers: 2× for full academy batch · +100 bonus per Silver+ friend.</div>
          <button onClick={() => triggerToast("Bonus tiers explained")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"6px 14px","borderRadius":"8px","fontSize":"11px","fontWeight":"800","border":"none","cursor":"pointer"}}>See all bonuses</button>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">👥</div>My Referred Friends <span className="count">8 INVITED · 5 ACTIVE · 2 PLACED</span></div><span className="sec-more" onClick={() => triggerToast("Full list opened")}>See all →</span></div>
        <div className="card" style={{"padding":"0"}}>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#FDBA74,#F97316)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>PR</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Priya Reddy · Apex Institute batch-mate</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Joined 5 Sep · HCC Specialty · Bengaluru</div></div>
            <span style={{"background":"var(--green-soft)","color":"var(--green)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>✓ PLACED at Optum</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>+1,200 pts</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>₹600</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#6366F1,#4F46E5)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>RK</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Rahul Kumar · College friend</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Joined 10 Sep · CDC Dental · Chennai</div></div>
            <span style={{"background":"var(--green-soft)","color":"var(--green)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>✓ PLACED at GeBBS</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>+1,200 pts</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>₹600</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#10B981,#059669)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>SN</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Sneha Nair · Neighbor</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Joined 12 Sep · Reached Silver Assessment</div></div>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>🥈 Silver reached</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>+700 pts</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>In progress</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#EC4899,#DB2777)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>DP</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Divya Patel · Cousin</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Joined 14 Sep · Completed Stage 03 Certification</div></div>
            <span style={{"background":"var(--blue-soft)","color":"var(--blue)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Stage 03 done</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>+300 pts</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>In progress</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#F59E0B,#D97706)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>AK</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Ajay Krishna · Apex batchmate</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Joined 15 Sep · Started Stage 02</div></div>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Building profile</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"13px"}}>+200 pts</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>In progress</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr auto auto auto","gap":"14px","padding":"14px 20px","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"var(--gray-soft)","color":"var(--gray-mute)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>?</div>
            <div><div style={{"fontWeight":"800","color":"var(--gray-txt)","fontSize":"13.5px"}}>3 friends invited · not signed up yet</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Sent WhatsApp invites 4 days ago · Send reminder?</div></div>
            <span style={{"background":"var(--amber-soft)","color":"var(--amber)","padding":"4px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800"}}>Pending</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>0 pts</span>
            <button onClick={() => triggerToast("Reminder sent to all 3 friends")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"4px 10px","borderRadius":"6px","fontSize":"10.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>🔔 Remind</button>
          </div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🎁</div>Redeem Your Points · 8 rewards available</div></div>
        <div style={{"display":"grid","gridTemplateColumns":"repeat(4,1fr)","gap":"14px"}}>
          <div style={{"background":"var(--white)","border":"2px solid var(--green)","borderRadius":"14px","padding":"18px","textAlign":"center","cursor":"pointer","transition":".15s"}} onClick={() => triggerToast("Amazon voucher order placed - email in 5 min")} onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 20px rgba(15,27,61,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>🛒</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>₹500 Amazon</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>Voucher · Instant email</div>
            <div style={{"background":"var(--green)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>1,000 pts · Available ✓</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--green)","borderRadius":"14px","padding":"18px","textAlign":"center","cursor":"pointer","transition":".15s"}} onClick={() => triggerToast("₹1,000 UPI cash withdrawal initiated")} onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 20px rgba(15,27,61,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>💰</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>₹1,000 Cash</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>UPI · 24 hrs</div>
            <div style={{"background":"var(--green)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>2,000 pts · Available ✓</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--gold)","borderRadius":"14px","padding":"18px","textAlign":"center","cursor":"pointer","transition":".15s"}} onClick={() => triggerToast("AAPC CEU credits activated")} onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 20px rgba(15,27,61,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>📚</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>6 AAPC CEUs</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>$60 value</div>
            <div style={{"background":"var(--red)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>5,000 pts · Need 1,153</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--purple)","borderRadius":"14px","padding":"18px","textAlign":"center","cursor":"pointer","transition":".15s"}} onClick={() => triggerToast("Save more points to unlock")} onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 20px rgba(15,27,61,.12)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>🏆</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>FREE CPC Exam</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>Worth $399 · Rare</div>
            <div style={{"background":"var(--red)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>10,000 pts · Need 6,153</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--purple)","borderRadius":"14px","padding":"18px","textAlign":"center","opacity":".7","cursor":"pointer"}} onClick={() => triggerToast("Refer more friends to unlock")}>
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>🎓</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>1-yr AAPC Membership</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>$205 · Renewal</div>
            <div style={{"background":"var(--gray-mute)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>20,000 pts</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--purple)","borderRadius":"14px","padding":"18px","textAlign":"center","opacity":".7","cursor":"pointer"}} onClick={() => triggerToast("Elite tier reward - refer 20+ friends")}>
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>💎</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>₹25k + Ambassador</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>Elite tier · Badge</div>
            <div style={{"background":"var(--gray-mute)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>50,000 pts</div>
          </div>
          <div style={{"background":"var(--white)","border":"2px solid var(--gold)","borderRadius":"14px","padding":"18px","textAlign":"center","opacity":".7","cursor":"pointer"}} onClick={() => triggerToast("Top tier - unlocked at 100k pts")}>
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>💻</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>MacBook Air M3</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"4px"}}>Top tier reward</div>
            <div style={{"background":"var(--gray-mute)","color":"var(--white)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>100,000 pts</div>
          </div>
          <div style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"14px","padding":"18px","textAlign":"center","cursor":"pointer"}} onClick={() => triggerToast("Donate to a student in need")}>
            <div style={{"fontSize":"38px","marginBottom":"8px"}}>❤</div>
            <div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>Donate to Student</div>
            <div style={{"fontSize":"11px","color":"var(--gray-txt)","marginTop":"4px"}}>Sponsor another candidate's CPC exam</div>
            <div style={{"background":"var(--gold)","color":"var(--navy)","padding":"5px 12px","borderRadius":"8px","fontSize":"12px","fontWeight":"800","marginTop":"10px","display":"inline-block"}}>Any amount</div>
          </div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🏅</div>Top Referrers This Month <span className="count">SEP 2026</span></div><span className="sec-more" onClick={() => triggerToast("Full leaderboard opened")}>See top 100 →</span></div>
        <div className="card" style={{"padding":"0"}}>
          <div style={{"display":"grid","gridTemplateColumns":"60px 1fr auto auto","gap":"16px","padding":"14px 22px","borderBottom":"1px solid var(--border)","alignItems":"center","background":"linear-gradient(90deg,var(--gold-pale),transparent)"}}>
            <div style={{"fontSize":"24px","fontWeight":"800","color":"var(--gold-deep)","textAlign":"center"}}>🥇</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>Karthik M. · Mumbai</div><div style={{"fontSize":"11.5px","color":"var(--gray-mute)","marginTop":"2px"}}>32 friends referred · 12 placed · Talentera Ambassador</div></div>
            <div style={{"fontWeight":"800","color":"var(--gold-deep)","fontSize":"15px"}}>28,400 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)"}}>Rank 1</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"60px 1fr auto auto","gap":"16px","padding":"14px 22px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--silver)","textAlign":"center"}}>🥈</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>Neha S. · Bengaluru</div><div style={{"fontSize":"11.5px","color":"var(--gray-mute)","marginTop":"2px"}}>24 friends · 8 placed</div></div>
            <div style={{"fontWeight":"800","color":"var(--gold-deep)","fontSize":"15px"}}>21,300 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)"}}>Rank 2</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"60px 1fr auto auto","gap":"16px","padding":"14px 22px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"fontSize":"22px","fontWeight":"800","color":"#B87333","textAlign":"center"}}>🥉</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>Rajesh P. · Chennai</div><div style={{"fontSize":"11.5px","color":"var(--gray-mute)","marginTop":"2px"}}>18 friends · 6 placed</div></div>
            <div style={{"fontWeight":"800","color":"var(--gold-deep)","fontSize":"15px"}}>15,700 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)"}}>Rank 3</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"60px 1fr auto auto","gap":"16px","padding":"14px 22px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--gray-mute)","textAlign":"center"}}>4</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>Anitha R. · Hyderabad</div><div style={{"fontSize":"11.5px","color":"var(--gray-mute)","marginTop":"2px"}}>14 friends · 5 placed</div></div>
            <div style={{"fontWeight":"800","color":"var(--gold-deep)","fontSize":"15px"}}>12,100 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)"}}>Rank 4</div>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"60px 1fr auto auto","gap":"16px","padding":"14px 22px","alignItems":"center","background":"linear-gradient(90deg,var(--blue-soft),transparent)","borderLeft":"4px solid var(--blue)"}}>
            <div style={{"fontSize":"16px","fontWeight":"800","color":"var(--blue)","textAlign":"center"}}>43</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"14px"}}>👉 You · Ananya Sharma · Bengaluru</div><div style={{"fontSize":"11.5px","color":"var(--blue)","marginTop":"2px","fontWeight":"700"}}>8 friends · 2 placed · Keep climbing!</div></div>
            <div style={{"fontWeight":"800","color":"var(--gold-deep)","fontSize":"15px"}}>3,847 pts</div>
            <div style={{"fontSize":"11px","color":"var(--blue)","fontWeight":"800"}}>Rank 43</div>
          </div>
        </div>
      </div>

      
      <div style={{"background":"var(--blue-soft)","border":"1.5px solid var(--blue)","borderRadius":"12px","padding":"18px 22px","marginTop":"16px"}}>
        <div style={{"fontSize":"13px","color":"var(--navy)","lineHeight":"1.6"}}>
          🛡 <b>Fair play rules:</b> Points vest only after your friend reaches Silver Assessment (real quality check). Same Aadhaar/mobile/bank blocks self-referrals. Cash withdrawals require PAN + KYC (already have from Stage 01). Talentera reserves right to freeze accounts on abuse. Points valid for 24 months from earning.
        </div>
      </div>
    </div>
)}

          {activeTab === 'employer-referrals' && (
<div className="page active" id="page-employer-referrals">
      <div className="page-head">
        <div className="page-eyebrow">🏢 Post-Placement Feature · Track referrals · Employer pays you DIRECT</div>
        <h1 className="page-title">Employer Referrals</h1>
        <p className="page-sub">You work at Optum. Share Optum's openings via Talentera. <b>Optum pays the referral bonus directly to YOUR salary account</b> — Talentera never touches the money. We just track the referral and reward you with 3,000 loyalty points per successful hire.</p>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,var(--blue-soft),#F5F8FF)","border":"2px solid var(--blue)","borderRadius":"16px","padding":"20px 24px","marginBottom":"20px"}}>
        <div style={{"display":"grid","gridTemplateColumns":"auto 1fr","gap":"16px","alignItems":"center"}}>
          <div style={{"fontSize":"40px"}}>💡</div>
          <div>
            <div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px"}}>How Employer Referral Payments actually work</div>
            <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","lineHeight":"1.6"}}>
              <b style={{"color":"var(--blue)"}}>Optum pays you directly through their payroll</b> (same account your salary goes to). Talentera does NOT sit in the middle for money — that would add unnecessary friction. We're the <b>matchmaker + tracker</b>, not the paymaster. You get Optum's full bonus (no Talentera cut) + we reward you with <b>3,000 Talentera loyalty points (₹1,500 value)</b> per successful hire — for engagement.
            </div>
          </div>
        </div>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,var(--green-soft),#F5FDF9)","border":"2px solid var(--green)","borderRadius":"18px","padding":"24px 28px","marginBottom":"20px"}}>
        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr 1fr","gap":"14px"}}>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--green)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>💰 From Optum Payroll</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>₹25,000</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>1 hire · paid direct to salary a/c</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--green)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>In Progress</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>₹85,000</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>3 in Optum pipeline · pending hire</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--gold-deep)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>🎁 Talentera Loyalty Pts</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"6px"}}>3,000 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Per hire · ₹1,500 value each</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--navy)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>📊 Total Value per Hire</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>₹26,500</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Bonus + Talentera pts stacked</div>
          </div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🏢</div>Optum's 12 Open Roles · Refer & Earn <span className="count priority">EXCLUSIVE TO EMPLOYEES</span></div><span className="sec-more" onClick={() => triggerToast("All 12 roles opened")}>View all →</span></div>

        <div className="card" style={{"padding":"18px 22px","borderLeft":"4px solid var(--gold)"}}>
          <div style={{"display":"grid","gridTemplateColumns":"1fr auto auto","gap":"16px","alignItems":"center","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px"}}>
              <div className="co-logo clr-optum" style={{"width":"52px","height":"52px"}}>O</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)"}}>Senior HCC Coder · US Medicare Adv.</div>
                  <span style={{"background":"var(--red)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>🔥 URGENT</span>
                </div>
                <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px","display":"flex","gap":"12px","flexWrap":"wrap"}}><span>📍 Hyderabad</span><span>💰 ₹8-11 LPA</span><span>🎯 1-3 yrs HCC exp</span><span>🕐 Day shift</span></div>
              </div>
            </div>
            <div style={{"textAlign":"center","background":"var(--gold-pale)","padding":"10px 16px","borderRadius":"10px","border":"1.5px solid var(--gold)"}}>
              <div style={{"fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":".5px"}}>REFERRAL BONUS</div>
              <div style={{"fontSize":"20px","fontWeight":"800","color":"var(--navy)"}}>₹35,000</div>
              <div style={{"fontSize":"9.5px","color":"var(--gray-mute)"}}>+ 2,000 Talentera pts</div>
            </div>
            <button onClick={() => setReferralModal({ open: true, title: "Optum · Senior HCC Coder (₹8-11 LPA)", sub: "optum-hcc-senior", link: "₹35,000" })} style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 22px","borderRadius":"12px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Refer a Friend</button>
          </div>
          <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
            <b>Best fit:</b> HCC coders with CRC/CDEO, 1-3 yrs on Medicare Advantage. Optum pays ₹25k on hire + ₹10k after 6-month retention.
          </div>
        </div>

        <div className="card" style={{"padding":"18px 22px","borderLeft":"4px solid var(--green)","marginTop":"10px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"1fr auto auto","gap":"16px","alignItems":"center","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px"}}>
              <div className="co-logo clr-optum" style={{"width":"52px","height":"52px"}}>O</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)"}}>HCC Coder (Fresher-Silver) · 5 openings</div>
                </div>
                <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px","display":"flex","gap":"12px","flexWrap":"wrap"}}><span>📍 Hyderabad · Onsite</span><span>💰 ₹5.5-7 LPA</span><span>🎯 Fresher OK</span><span>🕐 Day+Night</span></div>
              </div>
            </div>
            <div style={{"textAlign":"center","background":"var(--gold-pale)","padding":"10px 16px","borderRadius":"10px","border":"1.5px solid var(--gold)"}}>
              <div style={{"fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":".5px"}}>REFERRAL BONUS</div>
              <div style={{"fontSize":"20px","fontWeight":"800","color":"var(--navy)"}}>₹25,000</div>
              <div style={{"fontSize":"9.5px","color":"var(--gray-mute)"}}>+ 2,000 Talentera pts</div>
            </div>
            <button onClick={() => setReferralModal({ open: true, title: "Optum · HCC Coder Fresher (₹5.5-7 LPA)", sub: "optum-hcc-fresher", link: "₹25,000" })} style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 22px","borderRadius":"12px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Refer a Friend</button>
          </div>
          <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
            <b>Best fit:</b> Fresh CPC-holders with Silver Assessment + Silver Video Pitch. Perfect for your Apex batch-mates or academy friends still job-hunting.
          </div>
        </div>

        <div className="card" style={{"padding":"18px 22px","borderLeft":"4px solid var(--purple)","marginTop":"10px"}}>
          <div style={{"display":"grid","gridTemplateColumns":"1fr auto auto","gap":"16px","alignItems":"center","marginBottom":"12px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"14px"}}>
              <div className="co-logo clr-optum" style={{"width":"52px","height":"52px"}}>O</div>
              <div>
                <div style={{"display":"flex","alignItems":"center","gap":"8px","flexWrap":"wrap"}}>
                  <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)"}}>CDEO Auditor · Experienced HCC</div>
                  <span style={{"background":"var(--purple)","color":"var(--white)","padding":"2px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>💎 PREMIUM</span>
                </div>
                <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px","display":"flex","gap":"12px","flexWrap":"wrap"}}><span>📍 Hyderabad</span><span>💰 ₹12-16 LPA</span><span>🎯 5+ yrs · CDEO cert</span><span>🕐 Day</span></div>
              </div>
            </div>
            <div style={{"textAlign":"center","background":"linear-gradient(135deg,var(--gold-pale),#FFE4B5)","padding":"10px 16px","borderRadius":"10px","border":"2px solid var(--gold-deep)"}}>
              <div style={{"fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":".5px"}}>💎 PREMIUM BONUS</div>
              <div style={{"fontSize":"22px","fontWeight":"800","color":"var(--navy)"}}>₹50,000</div>
              <div style={{"fontSize":"9.5px","color":"var(--gray-mute)"}}>+ 5,000 Talentera pts</div>
            </div>
            <button onClick={() => setReferralModal({ open: true, title: "Optum · CDEO Auditor Premium (₹12-16 LPA)", sub: "optum-cdeo-auditor", link: "₹50,000" })} style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 22px","borderRadius":"12px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer","whiteSpace":"nowrap"}}>📤 Refer a Friend</button>
          </div>
          <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
            <b>Best fit:</b> Senior coders with CDEO + audit experience. Very hard to fill — Optum pays premium bonus.
          </div>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">📊</div>My Optum Referral Tracker <span className="count">4 REFERRED · 1 HIRED</span></div></div>
        <div className="card" style={{"padding":"0"}}>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 130px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#FDBA74,#F97316)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>PR</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Priya Reddy · HCC Coder Fresher</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 12 Aug · Hired 3 Sep</div></div>
            <span style={{"background":"var(--green-soft)","color":"var(--green)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>✓ HIRED · Optum</span>
            <span style={{"color":"var(--green)","fontWeight":"800","fontSize":"14px"}}>+₹22,500</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"12px"}}>+2,000 pts</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 130px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#6366F1,#4F46E5)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>VK</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Vishnu Kumar · Senior HCC (5 yrs)</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 5 Sep · Round 3 · Offer expected</div></div>
            <span style={{"background":"var(--blue-soft)","color":"var(--blue)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>🔵 Final Round</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹35,000</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 130px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#EC4899,#DB2777)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>RS</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Rohan Sharma · HCC Fresher</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 8 Sep · Round 2 scheduled</div></div>
            <span style={{"background":"var(--gold-pale)","color":"var(--gold-deep)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>🟡 Round 2</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹25,000</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 130px auto auto","gap":"14px","padding":"14px 20px","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#10B981,#059669)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>MK</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Meera K. · HCC Fresher</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 12 Sep · Applied via your link</div></div>
            <span style={{"background":"var(--gray-soft)","color":"var(--gray-mute)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>⚪ Applied</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹25,000</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
        </div>
      </div>

      
      <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"1.5px solid var(--gold)","padding":"22px 26px"}}>
        <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","marginBottom":"12px","display":"flex","alignItems":"center","gap":"10px"}}>💡 How Employer Referrals work · 3 steps</div>
        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px"}}>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--gold)","color":"var(--navy)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>1</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Share unique referral link</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>Click "Refer a Friend" on any Optum role. Talentera generates a link tracked to your Optum employee ID.</div>
          </div>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--gold)","color":"var(--navy)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>2</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Friend applies via your link</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>Optum HR sees "Referred by Ananya Sharma (HCC Coder, Optum ID 30489)" — added to internal employee-referral pipeline.</div>
          </div>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--green)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>3</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Friend hired · Optum pays you</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}><b style={{"color":"var(--blue)"}}>Optum pays the referral bonus (₹25-50k) DIRECTLY to your salary account</b> as per their internal policy. Talentera does NOT route the money. We separately award 3,000 loyalty points to your wallet.</div>
          </div>
        </div>
        <div style={{"background":"var(--blue-soft)","borderLeft":"3px solid var(--blue)","padding":"12px 16px","borderRadius":"0 8px 8px 0","marginTop":"14px","fontSize":"12px","color":"var(--navy)","lineHeight":"1.6"}}>
          🎯 <b>Value stack (real math):</b> Refer 5 friends per year at Optum = <b>₹1,25,000 direct from Optum</b> + <b>15,000 Talentera loyalty points (₹7,500)</b> = ₹1,32,500 side income. All on top of your ₹6.8 LPA salary. Talentera takes ZERO cut · Auto-tracked · Zero paperwork.
        </div>
      </div>
    </div>
)}

          {activeTab === 'academy-referrals' && (
<div className="page active" id="page-academy-referrals">
      <div className="page-head">
        <div className="page-eyebrow">🏫 Refer friends to training academies · Earn direct cash + loyalty pts</div>
        <h1 className="page-title">Refer to Academy</h1>
        <p className="page-sub">Know someone thinking about medical coding? Refer them to any Talentera-partner academy. Big academies pay you DIRECTLY (₹2,500-4,000). Smaller academies route through Talentera (15% platform fee for payment infra). You choose which academy to share.</p>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,#E0F2FE,#F0F9FF)","border":"2px solid #0EA5E9","borderRadius":"18px","padding":"24px 28px","marginBottom":"20px"}}>
        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr 1fr","gap":"14px"}}>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"#0284C7","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>💰 Lifetime Earnings</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>₹6,300</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>2 direct + 0 via Talentera</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"#0284C7","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>In Progress</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>₹8,700</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>3 enrolled, waiting Day-30 gate</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--gold-deep)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>🎁 Loyalty Pts</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--gold-deep)","marginTop":"6px"}}>1,000 pts</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>500 pts per enrollment</div>
          </div>
          <div style={{"textAlign":"center"}}>
            <div style={{"color":"var(--navy)","fontSize":"10.5px","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>📊 Enrolled Total</div>
            <div style={{"fontSize":"28px","fontWeight":"800","color":"var(--navy)","marginTop":"6px"}}>5</div>
            <div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Across 3 academies</div>
          </div>
        </div>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"16px","padding":"20px 24px","marginBottom":"20px"}}>
        <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","marginBottom":"12px"}}>💡 How academies pay referral bonuses · Two models</div>
        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"12px"}}>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1.5px solid var(--green)"}}>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"8px"}}>
              <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--green)"}}>🅰 Option A · Academy Pays DIRECT</div>
              <span style={{"background":"var(--green)","color":"var(--white)","padding":"3px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>₹0 FEE</span>
            </div>
            <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.6"}}>Large academies (Apex, Simplilearn, MedLearn) pay you <b>₹2,500 - ₹4,000</b> directly via UPI. Talentera takes 0% fee. Plus <b>500 loyalty pts</b> as engagement bonus.</div>
          </div>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1.5px solid var(--blue)"}}>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"8px"}}>
              <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--blue)"}}>🅱 Option B · Via Talentera</div>
              <span style={{"background":"var(--blue)","color":"var(--white)","padding":"3px 8px","borderRadius":"6px","fontSize":"10px","fontWeight":"800"}}>15% FEE</span>
            </div>
            <div style={{"fontSize":"12px","color":"var(--gray-txt)","lineHeight":"1.6"}}>Small academies send ₹3,000 to Talentera → we hold 15% (₹450) for payment infra + Day-30 audit → you get <b>₹2,550</b> to UPI in 7 days. Plus <b>500 loyalty pts</b>.</div>
          </div>
        </div>
      </div>

      
      <div style={{"background":"linear-gradient(135deg,#F0FDF4,#DCFCE7)","border":"2px solid var(--green)","borderRadius":"16px","padding":"22px 26px","marginBottom":"20px","position":"relative","overflow":"hidden"}}>
        <div style={{"position":"absolute","top":"0","right":"0","background":"var(--green)","color":"var(--white)","padding":"6px 18px","borderRadius":"0 0 0 12px","fontSize":"11px","fontWeight":"800","letterSpacing":".5px"}}>⭐ FEATURED SEP 2026</div>
        <div style={{"display":"grid","gridTemplateColumns":"auto 1fr auto","gap":"18px","alignItems":"center"}}>
          <div style={{"width":"68px","height":"68px","background":"linear-gradient(135deg,#6366F1,#4F46E5)","color":"var(--white)","borderRadius":"16px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"26px"}}>🏫</div>
          <div>
            <div style={{"fontSize":"11px","color":"var(--green)","fontWeight":"800","letterSpacing":"1px","textTransform":"uppercase"}}>FEATURED · Higher Bonus This Month</div>
            <div style={{"fontSize":"18px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Apex Medical Coding Institute · Bengaluru</div>
            <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px"}}>Your alma mater · 6-month HCC + E/M program · 84% placement rate · 340+ alumni on Talentera</div>
          </div>
          <div style={{"textAlign":"center","background":"var(--white)","padding":"14px 20px","borderRadius":"14px","border":"2px solid var(--green)"}}>
            <div style={{"fontSize":"9px","color":"var(--green)","fontWeight":"800","letterSpacing":".5px"}}>DIRECT BONUS</div>
            <div style={{"fontSize":"24px","fontWeight":"800","color":"var(--navy)","margin":"2px 0"}}>₹4,000</div>
            <div style={{"fontSize":"9.5px","color":"var(--gray-mute)"}}>+ 500 pts · Option A</div>
            <button onClick={() => triggerToast("Referral link generated · Share via WhatsApp")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"8px 14px","borderRadius":"8px","fontSize":"11px","fontWeight":"800","border":"none","cursor":"pointer","marginTop":"8px"}}>📤 Refer Now</button>
          </div>
        </div>
      </div>

      
      <div style={{"background":"var(--white)","border":"1.5px solid var(--border)","borderRadius":"14px","padding":"14px 18px","marginBottom":"16px","display":"grid","gridTemplateColumns":"repeat(5,1fr)","gap":"10px"}}>
        <div>
          <label style={{"display":"block","fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>📍 City</label>
          <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","padding":"8px 10px","border":"1px solid var(--border)","borderRadius":"8px","fontSize":"12px","background":"var(--white)","cursor":"pointer"}}><option>All 15 cities</option><option>Bengaluru (8 academies)</option><option>Chennai (6)</option><option>Hyderabad (7)</option><option>Kochi (4)</option><option>Mumbai (5)</option><option>Delhi-NCR (3)</option><option>Online-only (4)</option></select>
        </div>
        <div>
          <label style={{"display":"block","fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>🎯 Course Type</label>
          <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","padding":"8px 10px","border":"1px solid var(--border)","borderRadius":"8px","fontSize":"12px","background":"var(--white)","cursor":"pointer"}}><option>All courses</option><option>HCC · Risk Adjustment</option><option>E/M Coding</option><option>ED Coding</option><option>Surgery / IP-DRG</option><option>Dental · CDC</option><option>AR / Denials</option><option>Home Health</option><option>CPC Exam Prep</option></select>
        </div>
        <div>
          <label style={{"display":"block","fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>💰 Bonus Band</label>
          <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","padding":"8px 10px","border":"1px solid var(--border)","borderRadius":"8px","fontSize":"12px","background":"var(--white)","cursor":"pointer"}}><option>All</option><option>₹2,500 - ₹3,000</option><option>₹3,000 - ₹4,000</option><option>₹4,000+</option></select>
        </div>
        <div>
          <label style={{"display":"block","fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>💳 Payment Method</label>
          <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","padding":"8px 10px","border":"1px solid var(--border)","borderRadius":"8px","fontSize":"12px","background":"var(--white)","cursor":"pointer"}}><option>Any method</option><option>🅰 Direct pay (0% fee)</option><option>🅱 Via Talentera (15% fee)</option></select>
        </div>
        <div>
          <label style={{"display":"block","fontSize":"10px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":"1px","marginBottom":"5px","textTransform":"uppercase"}}>🗣 Language</label>
          <select onChange={(e) => triggerToast("Filter applied")} style={{"width":"100%","padding":"8px 10px","border":"1px solid var(--border)","borderRadius":"8px","fontSize":"12px","background":"var(--white)","cursor":"pointer"}}><option>All</option><option>English</option><option>Malayalam</option><option>Tamil</option><option>Telugu</option><option>Hindi</option><option>Kannada</option></select>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">🏫</div>All Partner Academies <span className="count">37 ACTIVE PARTNERS</span></div><span className="sec-more" onClick={() => triggerToast("Sorted by bonus")}>Sort: Highest bonus ↓</span></div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"12px"}}>
          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--green)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#6366F1,#4F46E5)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>🏫</div>
              <div style={{"flex":"1"}}><div style={{"display":"flex","alignItems":"center","gap":"6px"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Apex Medical Coding</div><span style={{"background":"var(--gold)","color":"var(--navy)","padding":"2px 6px","borderRadius":"5px","fontSize":"9px","fontWeight":"800"}}>ALUMNI</span></div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Bengaluru · Founded 2018 · 340 alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--green-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--green)","fontWeight":"800"}}>DIRECT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹4,000</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>6-month HCC + E/M · 84% placement · Fee ₹45,000 · Classroom + Online</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--green)","fontWeight":"800"}}>🅰 Direct pay · 0% fee</span>
              <button onClick={() => triggerToast("Referral link generated for Apex Institute")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>

          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--green)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#10B981,#059669)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>M</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>MedLearn Institute</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Chennai · Weekend bootcamps · 220 alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--green-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--green)","fontWeight":"800"}}>DIRECT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹3,500</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>3-month intensive CPC prep · Live faculty · 78% placement · Fee ₹28,000</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--green)","fontWeight":"800"}}>🅰 Direct pay · 0% fee</span>
              <button onClick={() => triggerToast("Referral link generated for MedLearn")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>

          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--green)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#EF4444,#DC2626)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>S</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Simplilearn RCM</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Online · Career program · 850+ alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--green-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--green)","fontWeight":"800"}}>DIRECT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹4,000</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>Full-stack RCM career program · 6 months · EMI available · Placement assistance</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--green)","fontWeight":"800"}}>🅰 Direct pay · 0% fee</span>
              <button onClick={() => triggerToast("Referral link generated for Simplilearn")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>

          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--blue)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#8B5CF6,#7C3AED)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>RW</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>RCM Wizards</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Hyderabad · Small academy · 45 alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--blue-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--blue)","fontWeight":"800"}}>VIA TT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹2,550</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>4-month HCC specialty · Hands-on Practicode · Fee ₹32,000 · Small batch</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--blue)","fontWeight":"800"}}>🅱 Via Talentera · Net ₹2,550</span>
              <button onClick={() => triggerToast("Referral link generated · You will receive ₹2,550 in 7 days after Day-30 gate")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>

          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--blue)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#F59E0B,#D97706)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>CS</div>
              <div style={{"flex":"1"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>Career Steps Academy</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Kochi · Malayalam + English · 120 alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--blue-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--blue)","fontWeight":"800"}}>VIA TT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹2,550</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>6-month CPC + AR · Regional language · Placement in Kerala + Chennai</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--blue)","fontWeight":"800"}}>🅱 Via Talentera · Net ₹2,550</span>
              <button onClick={() => triggerToast("Referral link generated for Career Steps")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>

          
          <div className="card" style={{"padding":"18px","marginBottom":"0","borderLeft":"4px solid var(--green)"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px","marginBottom":"10px"}}>
              <div style={{"width":"52px","height":"52px","background":"linear-gradient(135deg,#EC4899,#DB2777)","color":"var(--white)","borderRadius":"14px","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"20px"}}>🦷</div>
              <div style={{"flex":"1"}}><div style={{"display":"flex","alignItems":"center","gap":"6px"}}><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>BMSC Dental Coding</div><span style={{"background":"var(--purple)","color":"var(--white)","padding":"2px 6px","borderRadius":"5px","fontSize":"9px","fontWeight":"800"}}>SPECIALTY</span></div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Mumbai · Dental CDC prep · 90 alumni</div></div>
              <div style={{"textAlign":"center","background":"var(--green-soft)","padding":"6px 10px","borderRadius":"8px"}}><div style={{"fontSize":"9px","color":"var(--green)","fontWeight":"800"}}>DIRECT</div><div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>₹3,500</div></div>
            </div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","marginBottom":"10px","lineHeight":"1.5"}}>4-month specialty · CDT codes deep-dive · 88% placement at GeBBS + Dental360</div>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","paddingTop":"10px","borderTop":"1px dashed var(--border)"}}>
              <span style={{"fontSize":"10.5px","color":"var(--green)","fontWeight":"800"}}>🅰 Direct pay · 0% fee</span>
              <button onClick={() => triggerToast("Referral link generated for BMSC Dental")} style={{"background":"var(--gold)","color":"var(--navy)","padding":"7px 14px","borderRadius":"8px","fontSize":"11.5px","fontWeight":"800","border":"none","cursor":"pointer"}}>📤 Refer Friend</button>
            </div>
          </div>
        </div>

        <div style={{"textAlign":"center","marginTop":"16px"}}>
          <button onClick={() => triggerToast("Loading next 12 academies...")} style={{"background":"var(--white)","color":"var(--navy)","padding":"12px 26px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"2px solid var(--gold)","cursor":"pointer"}}>Load 12 more academies · 31 remaining →</button>
        </div>
      </div>

      
      <div className="sec">
        <div className="sec-head"><div className="sec-title"><div className="mod-ico">📊</div>My Academy Referral Tracker <span className="count">5 REFERRED · 2 PAID</span></div></div>
        <div className="card" style={{"padding":"0"}}>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 140px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#6366F1,#4F46E5)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>DP</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Divya Patel → Apex Institute · 6-mo HCC</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 15 Aug · Enrolled 20 Aug · Day-30 passed 20 Sep</div></div>
            <span style={{"background":"var(--green-soft)","color":"var(--green)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>✓ PAID · Direct</span>
            <span style={{"color":"var(--green)","fontWeight":"800","fontSize":"14px"}}>+₹4,000</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"12px"}}>+500 pts</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 140px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#F59E0B,#D97706)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>MP</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Meena Prakash → MedLearn · Weekend CPC prep</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 22 Aug · Enrolled 28 Aug · Day-30 passed 27 Sep</div></div>
            <span style={{"background":"var(--green-soft)","color":"var(--green)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>✓ PAID · Direct</span>
            <span style={{"color":"var(--green)","fontWeight":"800","fontSize":"14px"}}>+₹2,300</span>
            <span style={{"color":"var(--gold-deep)","fontWeight":"800","fontSize":"12px"}}>+500 pts</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 140px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#8B5CF6,#7C3AED)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>SM</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Suresh M. → RCM Wizards · 4-mo HCC</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 8 Sep · Enrolled 12 Sep · Day-30 in 6 days</div></div>
            <span style={{"background":"var(--amber-soft)","color":"var(--amber)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>🟡 Day-30 gate</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹2,550</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 140px auto auto","gap":"14px","padding":"14px 20px","borderBottom":"1px solid var(--border)","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#EC4899,#DB2777)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>AR</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Ajay R. → Career Steps · Malayalam batch</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 11 Sep · Enrolled 15 Sep · Day-30 in 9 days</div></div>
            <span style={{"background":"var(--amber-soft)","color":"var(--amber)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>🟡 Day-30 gate</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹2,550</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
          <div style={{"display":"grid","gridTemplateColumns":"44px 1fr 140px auto auto","gap":"14px","padding":"14px 20px","alignItems":"center"}}>
            <div style={{"width":"44px","height":"44px","background":"linear-gradient(135deg,#10B981,#059669)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"14px"}}>KS</div>
            <div><div style={{"fontWeight":"800","color":"var(--navy)","fontSize":"13.5px"}}>Kiran S. → Simplilearn · Full career program</div><div style={{"fontSize":"11px","color":"var(--gray-mute)","marginTop":"2px"}}>Referred 13 Sep · Enrolled 14 Sep · Day-30 in 15 days</div></div>
            <span style={{"background":"var(--amber-soft)","color":"var(--amber)","padding":"5px 10px","borderRadius":"8px","fontSize":"10.5px","fontWeight":"800","textAlign":"center"}}>🟡 Day-30 gate</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Est. ₹4,000</span>
            <span style={{"color":"var(--gray-mute)","fontSize":"11px"}}>Pending</span>
          </div>
        </div>
      </div>

      
      <div className="card" style={{"background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"1.5px solid var(--gold)","padding":"22px 26px"}}>
        <div style={{"fontSize":"15px","fontWeight":"800","color":"var(--navy)","marginBottom":"12px","display":"flex","alignItems":"center","gap":"10px"}}>💡 How Academy Referrals work · 3 steps</div>
        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px"}}>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--gold)","color":"var(--navy)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>1</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Share academy link</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>Pick any academy card. Click "📤 Refer Friend" → get unique tracking link. Share via WhatsApp / any channel.</div>
          </div>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--gold)","color":"var(--navy)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>2</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Friend enrolls</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>Friend clicks link → sees academy details → enrolls. Talentera notifies academy: "Referred by Ananya."</div>
          </div>
          <div style={{"background":"var(--white)","padding":"16px","borderRadius":"12px","border":"1px solid var(--gold-soft)"}}>
            <div style={{"width":"36px","height":"36px","background":"var(--green)","color":"var(--white)","borderRadius":"50%","display":"grid","placeItems":"center","fontWeight":"800","fontSize":"16px","marginBottom":"10px"}}>3</div>
            <div style={{"fontSize":"13px","fontWeight":"800","color":"var(--navy)","marginBottom":"4px"}}>Day-30 gate → You paid</div>
            <div style={{"fontSize":"11.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>After friend completes 30 days (retention check), academy pays you. <b>Option A: direct UPI. Option B: via Talentera in 7 days.</b></div>
          </div>
        </div>
        <div style={{"background":"var(--blue-soft)","borderLeft":"3px solid var(--blue)","padding":"12px 16px","borderRadius":"0 8px 8px 0","marginTop":"14px","fontSize":"12px","color":"var(--navy)","lineHeight":"1.6"}}>
          🎯 <b>Value stack (real math):</b> Refer 8 friends per year across academies = ~₹25,200 direct academy bonuses + 4,000 Talentera pts (₹2,000) = <b>₹27,200 side income</b>. All from your network. Zero effort after sharing the link.
        </div>
      </div>

      
      <div style={{"background":"var(--red-soft)","border":"1.5px solid var(--red)","borderRadius":"12px","padding":"16px 20px","marginTop":"16px","fontSize":"12.5px","color":"var(--navy)","lineHeight":"1.6"}}>
        🛡 <b>Anti-abuse rules:</b> Payout only after friend completes <b>Day-30 at academy</b> (real retention check). Same Aadhaar/mobile blocks self-referral. Max <b>20 academy referrals/year</b> per referrer. Academy has <b>7-day window</b> to dispute referral quality. 5% random audits. Talentera reserves right to freeze accounts on abuse.
      </div>
    </div>
)}

          {activeTab === 'employment' && (
<div className="page active" id="page-employment">
      <div className="page-head" style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","flexWrap":"wrap","gap":"16px"}}>
        <div>
          <div className="page-eyebrow">Your lifetime employment record · UAN-verified</div>
          <h1 className="page-title">Employment History</h1>
          <p className="page-sub">Add every job you take. Talentera builds a verified 30-year career passport that companies trust more than any resume.</p>
        </div>
        <button className="profile-cta" onClick={() => setShowAddJobForm(!showAddJobForm)} id="addJobBtn" style={{"background":"var(--gold)","color":"var(--navy)","padding":"14px 24px","fontSize":"14px","borderRadius":"12px","display":"flex","alignItems":"center","gap":"8px"}}>
          <span style={{"fontSize":"20px","lineHeight":"1"}}>➕</span> Add New Employment
        </button>
      </div>

      
      <div className="add-employment-form" id="addJobForm" style={{"display":"none","background":"linear-gradient(135deg,var(--gold-pale),#FFF9E0)","border":"2px solid var(--gold)","borderRadius":"16px","padding":"28px 30px","marginBottom":"20px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"20px"}}>
          <h2 style={{"fontSize":"18px","fontWeight":"800","color":"var(--navy)","margin":"0","display":"flex","alignItems":"center","gap":"10px"}}>💼 Add Your New Job at a Company</h2>
          <button onClick={() => setShowAddJobForm(!showAddJobForm)} style={{"background":"transparent","color":"var(--gray-mute)","fontSize":"22px","fontWeight":"800","cursor":"pointer","padding":"0 8px"}}>✕</button>
        </div>
        <p style={{"fontSize":"13px","color":"var(--gray-txt)","margin":"0 0 20px","lineHeight":"1.6"}}>Fill in the details of the company you're joining. Upload your offer letter — Talentera auto-extracts the CTC, joining date and role. UAN sync will confirm your employment monthly.</p>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🏢 Company Name *</label>
            <input type="text" placeholder="e.g. Optum India" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🎯 Your Role / Designation *</label>
            <input type="text" placeholder="e.g. HCC Medical Coder" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🩺 Department / Specialty *</label>
            <select style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}>
              <option>HCC · Risk Adjustment</option>
              <option>E/M Coding</option>
              <option>ED Coding</option>
              <option>Surgery Coding</option>
              <option>IP-DRG</option>
              <option>Home Health · HCS-D</option>
              <option>Dental · CDT</option>
              <option>AR Calling / Denials</option>
              <option>Charge Entry / Billing</option>
              <option>Front Office / Pre-Auth</option>
              <option>QA / Auditor</option>
            </select>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📍 Work Location *</label>
            <input type="text" placeholder="e.g. Hyderabad · Onsite" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📅 Joining Date *</label>
            <input type="text" placeholder="25 / 09 / 2026" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>💰 Base CTC (₹ LPA) *</label>
            <input type="text" placeholder="6.8" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🏢 Employment Type *</label>
            <select style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}>
              <option>Full Time · Permanent</option>
              <option>Trainee (6-month contract)</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📄 Upload Offer Letter *</label>
            <div style={{"border":"2px dashed var(--gold)","background":"var(--white)","borderRadius":"9px","padding":"16px 14px","textAlign":"center","cursor":"pointer"}} onClick={() => triggerToast("File picker opened")}>
              <div style={{"fontSize":"24px","marginBottom":"4px"}}>📎</div>
              <div style={{"fontSize":"12px","color":"var(--navy)","fontWeight":"800"}}>Click to upload PDF</div>
              <div style={{"fontSize":"10.5px","color":"var(--gray-mute)","marginTop":"2px"}}>Auto-extracts CTC, date, role</div>
            </div>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>🆔 UAN Number (auto-verify monthly)</label>
            <input type="text" placeholder="12-digit UAN" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)","marginBottom":"8px"}}/>
            <div style={{"fontSize":"10.5px","color":"var(--gray-mute)","fontStyle":"italic"}}>Talentera syncs monthly with EPFO to confirm you're still employed. Ensures your record stays live and verified.</div>
          </div>
        </div>

        <div style={{"display":"grid","gridTemplateColumns":"1fr 1fr","gap":"14px","marginBottom":"14px"}}>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>👤 Reporting Manager (optional)</label>
            <input type="text" placeholder="Manager name" style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
          <div>
            <label style={{"display":"block","fontSize":"11.5px","fontWeight":"800","color":"var(--navy)","marginBottom":"6px","letterSpacing":".5px"}}>📋 Project / Client (optional)</label>
            <input type="text" placeholder="e.g. UnitedHealthcare · HCC Risk Adj." style={{"width":"100%","padding":"11px 14px","border":"1.5px solid var(--border)","borderRadius":"9px","fontSize":"13.5px","background":"var(--white)"}}/>
          </div>
        </div>

        <div style={{"display":"flex","gap":"10px","marginTop":"20px","justifyContent":"flex-end"}}>
          <button onClick={() => setShowAddJobForm(!showAddJobForm)} style={{"background":"transparent","color":"var(--gray-txt)","padding":"12px 22px","borderRadius":"10px","fontSize":"13px","fontWeight":"700","border":"1.5px solid var(--border)","cursor":"pointer"}}>Cancel</button>
          <button onClick={handleSaveEmployment} style={{"background":"var(--gold)","color":"var(--navy)","padding":"12px 26px","borderRadius":"10px","fontSize":"13px","fontWeight":"800","border":"none","cursor":"pointer"}}>✓ Save & Activate Career Loop</button>
        </div>

        <div style={{"background":"var(--blue-soft)","borderLeft":"3px solid var(--blue)","padding":"10px 14px","borderRadius":"0 8px 8px 0","marginTop":"16px","fontSize":"11.5px","color":"var(--navy)","lineHeight":"1.5"}}>
          🔒 <b>DPDP-compliant:</b> Your offer letter is stored in My Documents (encrypted, DPDP-Act-verified). Talentera never shares raw offer letters with anyone — only extracted metadata (CTC, date, role) appears on your public profile.
        </div>
      </div>

      
      <div className="card" style={{"background":"linear-gradient(135deg,var(--green-soft),#F5FDF9)","border":"2px solid var(--green)","padding":"22px 26px"}}>
        <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-start","marginBottom":"16px"}}>
          <div style={{"display":"flex","alignItems":"center","gap":"16px"}}>
            <div className="co-logo clr-optum" style={{"width":"64px","height":"64px","borderRadius":"16px","fontSize":"22px"}}>O</div>
            <div>
              <div style={{"color":"var(--green)","fontSize":"11px","fontWeight":"800","letterSpacing":"1.2px","textTransform":"uppercase"}}>🟢 CURRENT EMPLOYMENT · UAN VERIFIED</div>
              <div style={{"fontSize":"20px","fontWeight":"800","color":"var(--navy)","marginTop":"4px"}}>Optum India · HCC Medical Coder</div>
              <div style={{"fontSize":"13px","color":"var(--gray-txt)","marginTop":"4px"}}>Hyderabad · Full Time · UnitedHealthcare project</div>
            </div>
          </div>
          <div style={{"textAlign":"right"}}>
            <div style={{"background":"var(--green)","color":"var(--white)","padding":"6px 14px","borderRadius":"10px","fontSize":"11px","fontWeight":"800","letterSpacing":".4px"}}>🟢 ACTIVE · 3 MONTHS</div>
            <button className="btn-secondary" style={{"marginTop":"8px"}} onClick={() => triggerToast("Opening edit form")}>✎ Edit</button>
          </div>
        </div>
        <div style={{"display":"grid","gridTemplateColumns":"repeat(5,1fr)","gap":"10px"}}>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Joining Date</div><div className="v">25 Sep 2026</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Base CTC</div><div className="v">₹6.8 LPA</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Department</div><div className="v">HCC Risk Adj.</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">Manager</div><div className="v">Ravi K.</div></div>
          <div className="field" style={{"background":"var(--white)"}}><div className="k">UAN Status</div><div className="v" style={{"color":"var(--green)"}}>🟢 Synced Dec 2026</div></div>
        </div>
        <div style={{"background":"var(--white)","borderRadius":"10px","padding":"12px 16px","marginTop":"12px","display":"flex","justifyContent":"space-between","alignItems":"center"}}>
          <div style={{"fontSize":"12.5px","color":"var(--gray-txt)","lineHeight":"1.5"}}>
            <b style={{"color":"var(--navy)"}}>📎 Documents on file:</b> Offer Letter (25 Sep 2026) · Signed Contract · Payslip Sep-Dec
          </div>
          <button className="btn-secondary" onClick={() => setActiveTab("documents")}>Open Vault →</button>
        </div>
      </div>

      
      <div className="card" style={{"marginTop":"16px","background":"#FAFAF7"}}>
        <div style={{"display":"flex","gap":"16px","alignItems":"center"}}>
          <div style={{"fontSize":"38px"}}>💡</div>
          <div style={{"flex":"1"}}>
            <div style={{"fontSize":"14px","fontWeight":"800","color":"var(--navy)"}}>When you join your next company — click "Add New Employment" above</div>
            <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px","lineHeight":"1.6"}}>
              Each new job you add becomes part of your lifetime career passport. Talentera captures: <b>offer letter · joining date · base CTC · department · manager</b>. When you leave, upload the <b>relieving letter</b> — Talentera auto-parses your exit date, final CTC and tenure.
            </div>
          </div>
        </div>
      </div>

      
      <div style={{"marginTop":"24px"}}>
        <h3 style={{"fontSize":"16px","fontWeight":"800","color":"var(--navy)","margin":"0 0 14px","display":"flex","alignItems":"center","gap":"10px"}}><div className="mod-ico">📅</div>Your Lifetime Employment Preview · 30-year career passport</h3>
        <div style={{"background":"var(--white)","border":"1px solid var(--border)","borderRadius":"14px","padding":"22px 26px"}}>
          <div style={{"position":"relative","paddingLeft":"28px"}}>
            <div style={{"position":"absolute","left":"12px","top":"14px","bottom":"14px","width":"2px","background":"var(--gold-pale)"}}></div>

            <div style={{"position":"relative","padding":"14px 0 18px"}}>
              <div style={{"position":"absolute","left":"-19px","top":"20px","width":"14px","height":"14px","background":"var(--green)","border":"3px solid var(--white)","borderRadius":"50%","boxShadow":"0 0 0 2px var(--green-soft)"}}></div>
              <div style={{"fontSize":"11px","color":"var(--green)","fontWeight":"800","letterSpacing":".4px"}}>Sep 2026 · Present · Job 1 · 🟢 ACTIVE</div>
              <div style={{"fontSize":"14px","color":"var(--navy)","fontWeight":"800","marginTop":"3px"}}>Optum India · HCC Medical Coder</div>
              <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px"}}>₹6.8 LPA · Hyderabad · Fresher → Junior transition at Sep 2027</div>
            </div>

            <div style={{"position":"relative","padding":"14px 0 18px","opacity":".55"}}>
              <div style={{"position":"absolute","left":"-19px","top":"20px","width":"14px","height":"14px","background":"var(--gold)","border":"3px solid var(--white)","borderRadius":"50%","boxShadow":"0 0 0 2px var(--gold-pale)"}}></div>
              <div style={{"fontSize":"11px","color":"var(--gold-deep)","fontWeight":"800","letterSpacing":".4px"}}>FUTURE · Job 2 · Est. Sep 2028</div>
              <div style={{"fontSize":"14px","color":"var(--navy)","fontWeight":"800","marginTop":"3px"}}>Add when you switch to next company</div>
              <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px"}}>Ex-Optum + 2 yrs HCC → target Senior HCC roles at ₹9-12 LPA</div>
            </div>

            <div style={{"position":"relative","padding":"14px 0 18px","opacity":".35"}}>
              <div style={{"position":"absolute","left":"-19px","top":"20px","width":"14px","height":"14px","background":"var(--gray-mute)","border":"3px solid var(--white)","borderRadius":"50%"}}></div>
              <div style={{"fontSize":"11px","color":"var(--gray-mute)","fontWeight":"800","letterSpacing":".4px"}}>FUTURE · Job 3+ · Est. 2030+</div>
              <div style={{"fontSize":"14px","color":"var(--navy)","fontWeight":"800","marginTop":"3px"}}>Mid-level → Senior HCC · Team Lead</div>
              <div style={{"fontSize":"12px","color":"var(--gray-txt)","marginTop":"4px"}}>Every job you add builds a verified, filterable career story</div>
            </div>
          </div>
          <div style={{"background":"var(--blue-soft)","borderLeft":"3px solid var(--blue)","padding":"12px 16px","borderRadius":"0 10px 10px 0","marginTop":"8px","fontSize":"12px","color":"var(--navy)","lineHeight":"1.6"}}>
            🎯 <b>Same Talentera account · Same Career Passport · For 30-40 years.</b> Every job you add, every promotion, every salary hike — verified and captured. When you apply for your 10th job in 2040, the hiring manager sees your entire verified journey from Fresher (2026) to Senior (2040). No re-registration. No lost data. Ever.
          </div>
        </div>
      </div>
    </div>
)}

          {activeTab === 'learning' && (
<div className="page active" id="page-learning">
      <div className="page-head">
        <div className="page-eyebrow">Videos + Courses + Question Bank + Partner Academies</div>
        <h1 className="page-title">Learning Hub</h1>
        <p className="page-sub">8 stage tutorials · 500+ interview questions · 12 third-party partners (AAPC, Coursera, Udemy, LinkedIn, MedLearn).</p>
      </div>
      <div className="placeholder-page">
        <div className="placeholder-ico">📚</div>
        <div className="placeholder-title">Full Learning Hub</div>
        <div className="placeholder-sub">Interview prep videos, RCM question bank filterable by specialty, and click-through partner academy enrollment. Personalized recommendations based on your Assessment weaknesses.</div>
        <button className="placeholder-btn" onClick={() => triggerToast("Loading Learning Hub")}>Open Learning Hub →</button>
      </div>
    </div>
)}

          {activeTab === 'analytics' && (
<div className="page active" id="page-analytics">
      <div className="page-head">
        <div className="page-eyebrow">Deep career metrics</div>
        <h1 className="page-title">Career Analytics</h1>
      </div>
      <div className="placeholder-page">
        <div className="placeholder-ico">📊</div>
        <div className="placeholder-title">Your Career Metrics</div>
        <div className="placeholder-sub">Shortlist rate 71% · Interview-to-offer 67% · Days since live 12 · Best CTC ₹6.8 LPA · Charts/hour 2.9</div>
        <button className="placeholder-btn" onClick={() => triggerToast("Analytics dashboard loading")}>View Full Analytics →</button>
      </div>
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
          <div className="setting-row"><div><div className="setting-label">Profile Live for Hiring</div><div className="setting-desc">Companies can find you</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Available Immediately</div><div className="setting-desc">Show green available badge</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">Open to Relocation</div><div className="setting-desc">Anywhere in India</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
          <div className="setting-row"><div><div className="setting-label">US Night Shift</div><div className="setting-desc">Accept US-facing roles</div></div><div className="toggle on" onClick={(e) => e.currentTarget.classList.toggle("on")}></div></div>
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
          <div className="setting-row"><div><div className="setting-label">Email</div><div className="setting-desc">ananya@example.com</div></div><button className="btn-secondary" onClick={() => triggerToast("Verification email sent")}>Change</button></div>
          <div className="setting-row"><div><div className="setting-label">Mobile</div><div className="setting-desc">+91 98765 43210</div></div><button className="btn-secondary" onClick={() => triggerToast("OTP sent to new number")}>Change</button></div>
          <div className="setting-row"><div><div className="setting-label">Password</div><div className="setting-desc">Last changed 30 days ago</div></div><button className="btn-secondary" onClick={() => triggerToast("Password reset email sent")}>Change</button></div>
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
        <div className="placeholder-sub">Live chat with Talentera team · FAQ library · Video tutorials · WhatsApp support at +91 98765 00001.</div>
        <button className="placeholder-btn" onClick={() => triggerToast("Chat opened. Support team will respond in 2 min.")}>Start Live Chat →</button>
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
    </div>
  );
}
