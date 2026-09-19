import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';

export default function CandidateEmployerReferralsSection({
  candidate,
  referralsData,
  jobs = [],
  onRefresh,
  triggerToast,
}) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [localJobs, setLocalJobs] = useState(jobs || []);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [filterCompany, setFilterCompany] = useState('All');
  const [employerForm, setEmployerForm] = useState({
    companyName: '',
    contactPerson: '',
    designation: '',
    workEmail: '',
    phone: '',
    hiringNeeds: '',
    hiringVolume: '',
    city: '',
    notes: '',
  });
  const [submittingLead, setSubmittingLead] = useState(false);

  // Sync or fetch jobs from database if not provided
  useEffect(() => {
    if (jobs && jobs.length > 0) {
      setLocalJobs(jobs);
    } else {
      let isMounted = true;
      const fetchJobs = async () => {
        setLoadingJobs(true);
        try {
          const res = await api.get('/candidate/jobs');
          if (isMounted && res.data?.jobs) {
            setLocalJobs(res.data.jobs);
          }
        } catch (err) {
          console.error('Failed to load employer jobs for referral', err);
        } finally {
          if (isMounted) setLoadingJobs(false);
        }
      };
      fetchJobs();
      return () => { isMounted = false; };
    }
  }, [jobs]);

  const employerReferrals = referralsData?.employerReferrals || [];
  
  // Real candidate stage data for placement & past employer
  const candidateCompany = 
    candidate?.stage8?.placedCompany || 
    candidate?.stage8?.companyName || 
    candidate?.stage3?.company || 
    candidate?.stage3?.employerName || 
    (localJobs[0]?.companyName || localJobs[0]?.company) ||
    'Talentera Partner Network';
    
  const candidateName = candidate?.stage1?.fullname || candidate?.stage1?.fullName || candidate?.fullname || 'Candidate';
  const candidateSlug = candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Compute metrics strictly from candidate's real referrals
  const hiredCount = employerReferrals.filter((r) => r.status === 'HIRED' || r.status === 'COMPLETED').length;
  const inProgressCount = employerReferrals.filter((r) => r.status !== 'HIRED' && r.status !== 'COMPLETED' && r.status !== 'REJECTED').length;
  const totalDirectCash = hiredCount * 25000;
  const totalInProgressCash = inProgressCount * 25000;
  const loyaltyPointsEarned = hiredCount * 3000;

  // Compute open roles purely from MongoDB jobs collection
  const openRoles = useMemo(() => {
    if (!localJobs || localJobs.length === 0) return [];
    return localJobs.map((job) => {
      const comp = job.companyName || job.company || 'Healthcare Partner';
      const maxCtc = job.maxSalary || 8;
      const minCtc = job.minSalary || 4;
      const bonusNum = Math.min(50000, Math.max(20000, Math.round(maxCtc * 3500)));
      const bonusFormatted = `₹${bonusNum.toLocaleString('en-IN')}`;
      const isCandidateCompany = candidateCompany && comp.toLowerCase().includes(candidateCompany.toLowerCase());

      return {
        id: job._id || job.id,
        title: job.title || job.role || 'Medical Coding Specialist',
        company: comp,
        tag: isCandidateCompany ? '⭐ YOUR COMPANY' : (job.isUrgent ? '🔥 URGENT' : (job.badge || (job.minExperience >= 3 ? '💎 EXPERIENCED' : '⭐ OPENING'))),
        tagColor: isCandidateCompany ? 'var(--gold-deep)' : (job.isUrgent ? 'var(--red)' : 'var(--navy)'),
        loc: job.location || job.city || 'Pan-India',
        ctc: job.salaryRange || (job.minSalary && job.maxSalary ? `₹${minCtc}-${maxCtc} LPA` : (job.maxSalary ? `Up to ₹${maxCtc} LPA` : 'Best in Industry')),
        exp: job.experience || (job.minExperience ? `${job.minExperience}+ yrs exp` : 'Fresher / Experienced'),
        shift: job.shift || job.workMode || 'Full Time · Day Shift',
        bonus: bonusFormatted,
        bonusVal: bonusNum,
        loyaltyPts: '3,000',
        bestFit: job.description || job.summary || `Verified coders matching ${job.specialty || job.department || 'Healthcare'} domain requirements. Employer pays referral bonus directly on candidate placement.`,
        isCandidateCompany,
      };
    });
  }, [localJobs, candidateCompany]);

  const availableCompanies = useMemo(() => {
    return ['All', ...new Set(openRoles.map((r) => r.company).filter(Boolean))];
  }, [openRoles]);

  const filteredRoles = useMemo(() => {
    if (filterCompany === 'All') return openRoles;
    return openRoles.filter((r) => r.company === filterCompany);
  }, [openRoles, filterCompany]);

  const handleOpenReferralFlow = (job) => {
    setActiveJobModal(job);
  };

  const handleCopyJobLink = (job) => {
    const link = `https://talentera.io/refer/${job.id}/${candidateSlug}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      triggerToast('Tracked referral link copied to clipboard!');
    } else {
      triggerToast('Referral link: ' + link);
    }
  };

  const handleSubmitLead = async (e) => {
    if (e) e.preventDefault();
    if (!employerForm.companyName || !employerForm.contactPerson || (!employerForm.workEmail && !employerForm.phone)) {
      triggerToast('Company name, contact person, and email or phone are required.');
      return;
    }
    setSubmittingLead(true);
    try {
      const res = await api.post('/candidate/referrals/submit-employer', employerForm);
      triggerToast(res.data?.message || 'Employer lead submitted successfully!');
      setEmployerForm({
        companyName: '',
        contactPerson: '',
        designation: '',
        workEmail: '',
        phone: '',
        hiringNeeds: '',
        hiringVolume: '',
        city: '',
        notes: '',
      });
      setShowSubmitModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not submit company lead.');
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <div className="page active" id="page-employer-referrals">
      {/* PAGE HEADER */}
      <div className="page-head">
        <div className="page-eyebrow">🏢 Post-Placement Feature · Track referrals · Employer pays you DIRECT</div>
        <h1 className="page-title">Employer Referrals</h1>
        <p className="page-sub">
          Share openings at <b>{candidateCompany}</b> or partner employers via Talentera. <b>The employer pays the referral bonus directly to YOUR salary account</b> — Talentera never touches the money. We just track the referral and reward you with 3,000 loyalty points per successful hire.
        </p>
      </div>

      {/* MODEL EXPLANATION BOX */}
      <div style={{ background: 'linear-gradient(135deg, var(--blue-soft), #F5F8FF)', border: '2px solid var(--blue)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontSize: '40px' }}>💡</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)', marginBottom: '6px' }}>
              How Employer Referral Payments actually work
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--gray-txt)', lineHeight: 1.6 }}>
              <b style={{ color: 'var(--blue)' }}>{candidateCompany} pays you directly through their payroll</b> (same account your salary goes to). Talentera does NOT sit in the middle for money — that would add unnecessary friction. We're the <b>matchmaker + tracker</b>, not the paymaster. You get the full bonus (no Talentera cut) + we reward you with <b>3,000 Talentera loyalty points (₹1,500 value)</b> per successful hire — for engagement.
            </div>
          </div>
        </div>
      </div>

      {/* EARNINGS SUMMARY BANNER */}
      <div style={{ background: 'linear-gradient(135deg, var(--green-soft), #F5FDF9)', border: '2px solid var(--green)', borderRadius: '18px', padding: '24px 28px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--green)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>💰 From Employer Payroll</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>₹{totalDirectCash.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>{hiredCount} hire{hiredCount === 1 ? '' : 's'} · paid direct to salary a/c</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--green)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>₹{totalInProgressCash.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>{inProgressCount} in pipeline · pending hire</div>
          </div>
          <div style={{ color: 'var(--gold-deep)', textAlign: 'center' }}>
            <div style={{ color: 'var(--gold-deep)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>🎁 Talentera Loyalty Pts</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '6px' }}>{loyaltyPointsEarned.toLocaleString()} pts</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>3,000 pts per hire (₹1,500 value each)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--navy)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>📊 Total Value per Hire</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>₹26,500</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>Bonus + Talentera pts stacked</div>
          </div>
        </div>
      </div>

      {/* OPEN ROLES TO REFER */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div className="mod-ico">🏢</div>Partner Employer Open Roles <span className="count">{filteredRoles.length} ROLES</span>
            {availableCompanies.length > 2 && (
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                style={{ padding: '4px 10px', borderRadius: '8px', border: '1.5px solid var(--border)', fontSize: '12px', background: 'var(--white)', cursor: 'pointer', fontWeight: '700' }}
              >
                {availableCompanies.map((c) => (
                  <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '6px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
          >
            + Submit Custom Company Lead
          </button>
        </div>

        {loadingJobs ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-mute)' }}>Loading live employer positions from database...</div>
        ) : filteredRoles.length > 0 ? (
          filteredRoles.map((role) => (
            <div key={role.id} className="card" style={{ padding: '18px 22px', borderLeft: `4px solid ${role.isCandidateCompany ? 'var(--gold)' : 'var(--navy)'}`, marginBottom: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, var(--navy), #1E3A8A)', color: 'var(--gold)', borderRadius: '14px', display: 'grid', placeItems: 'center', fontWeight: '900', fontSize: '22px' }}>
                    {(role.company || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)' }}>{role.title}</div>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--gray-txt)' }}>· {role.company}</span>
                      {role.tag && (
                        <span style={{ background: role.tagColor, color: 'var(--white)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>
                          {role.tag}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-txt)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📍 {role.loc}</span>
                      <span>💰 {role.ctc}</span>
                      <span>🎯 {role.exp}</span>
                      <span>🕐 {role.shift}</span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--gold-pale)', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid var(--gold)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '.5px' }}>REFERRAL BONUS</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)' }}>{role.bonus}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--gray-mute)' }}>+ {role.loyaltyPts} Talentera pts</div>
                </div>
                <button
                  onClick={() => handleOpenReferralFlow(role)}
                  style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '14px 22px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  📤 Refer a Friend
                </button>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                <b>Job Details:</b> {role.bestFit}
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
            <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '15px' }}>No active employer openings listed currently</div>
            <p style={{ color: 'var(--gray-mute)', fontSize: '12.5px', maxWidth: '440px', margin: '6px auto 16px' }}>
              Have openings at your company or know an employer hiring medical coders? Submit their details and earn direct bounties!
            </p>
            <button
              onClick={() => setShowSubmitModal(true)}
              style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '12.5px', border: 'none', cursor: 'pointer' }}
            >
              + Submit Company Lead
            </button>
          </div>
        )}
      </div>

      {/* MY EMPLOYER REFERRAL TRACKER */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">📊</div>My Employer Referral Tracker <span className="count">{employerReferrals.length} LOGGED</span>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
          >
            + Add new lead →
          </button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {employerReferrals.length > 0 ? (
            employerReferrals.map((lead) => (
              <div key={lead.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 130px auto auto', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #FDBA74, #F97316)', color: 'var(--white)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '14px' }}>
                  {(lead.contactPerson || lead.companyName || 'CO').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '13.5px' }}>
                    {lead.companyName} · {lead.contactPerson}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>
                    {lead.designation || 'Hiring Lead'} · {lead.hiringNeeds || 'Medical Coders'} {lead.city ? `· ${lead.city}` : ''} · {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                  </div>
                </div>
                <span style={{ background: lead.status === 'HIRED' ? 'var(--green-soft)' : 'var(--blue-soft)', color: lead.status === 'HIRED' ? 'var(--green)' : 'var(--blue)', padding: '5px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: '800', textAlign: 'center' }}>
                  {lead.status === 'HIRED' ? '✓ HIRED' : lead.status || 'In Review'}
                </span>
                <span style={{ color: lead.status === 'HIRED' ? 'var(--green)' : 'var(--navy)', fontWeight: '800', fontSize: '13.5px' }}>
                  {lead.potentialBounty || '₹25,000'}
                </span>
                <span style={{ color: 'var(--gold-deep)', fontWeight: '800', fontSize: '12px' }}>
                  +3,000 pts
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
              <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '15px' }}>No employer referrals submitted yet</div>
              <p style={{ color: 'var(--gray-mute)', fontSize: '12.5px', maxWidth: '440px', margin: '6px auto 16px' }}>
                Know a company hiring medical coders or want to refer peers to your company? Submit their details and earn up to ₹50,000 direct payout!
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '12.5px', border: 'none', cursor: 'pointer' }}
              >
                ➕ Submit a Company Lead
              </button>
            </div>
          )}
        </div>
      </div>

      {/* HOW IT WORKS (3 STEPS) */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '1.5px solid var(--gold)', padding: '22px 26px', marginTop: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          💡 How Employer Referrals work · 3 steps
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gold-soft)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              1
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Share unique referral link</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              Click "Refer a Friend" on any role. Talentera generates a link tracked to your employee ID &amp; profile.
            </div>
          </div>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gold-soft)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              2
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Friend applies via your link</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              Employer HR sees "Referred by {candidateName}" — added to the fast-track employee referral pipeline.
            </div>
          </div>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--green)', borderTop: '3px solid var(--green)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--green)', color: 'var(--white)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              3
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Friend hired · Employer pays you</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--blue)' }}>The employer pays the referral bonus (₹25k-50k) DIRECTLY to your salary account</b>. Talentera routes 0% cut + adds 3,000 points.
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--blue-soft)', borderLeft: '3px solid var(--blue)', padding: '12px 16px', borderRadius: '0 8px 8px 0', marginTop: '14px', fontSize: '12px', color: 'var(--navy)', lineHeight: 1.6 }}>
          🎯 <b>Value stack (real math):</b> Refer 5 friends per year at {candidateCompany} = <b>₹1,25,000 direct from employer</b> + <b>15,000 Talentera loyalty points (₹7,500)</b> = ₹1,32,500 side income. All on top of your primary salary. Talentera takes ZERO cut · Auto-tracked · Zero paperwork.
        </div>
      </div>

      {/* REFERRAL FLOW MODAL (JOB SPECIFIC) */}
      {activeJobModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setActiveJobModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Refer to {activeJobModal.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--gold-deep)', fontWeight: '700', marginBottom: '16px' }}>
              Employer pays you {activeJobModal.bonus} direct · Talentera adds {activeJobModal.loyaltyPts} loyalty pts
            </div>
            <div style={{ background: 'var(--gold-pale)', border: '1.5px solid var(--gold)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '800', color: 'var(--navy)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                talentera.io/refer/{activeJobModal.id}/{candidateSlug}
              </span>
              <button
                onClick={() => handleCopyJobLink(activeJobModal)}
                style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                📋 Copy Link
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  const text = `Opening at ${activeJobModal.company}: ${activeJobModal.title} (${activeJobModal.ctc}). Apply via my referral link: https://talentera.io/refer/${activeJobModal.id}/${candidateSlug}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                style={{ background: '#25D366', color: 'var(--white)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                💬 WhatsApp Friend
              </button>
              <button
                onClick={() => {
                  const text = `We are hiring for ${activeJobModal.title} at ${activeJobModal.company}! Referral link: https://talentera.io/refer/${activeJobModal.id}/${candidateSlug}`;
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://talentera.io/refer/' + activeJobModal.id + '/' + candidateSlug)}`, '_blank');
                }}
                style={{ background: '#0A66C2', color: 'var(--white)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                💼 LinkedIn Share
              </button>
            </div>
            <button
              onClick={() => {
                setActiveJobModal(null);
                setEmployerForm({
                  ...employerForm,
                  companyName: activeJobModal.company,
                  hiringNeeds: activeJobModal.title,
                });
                setShowSubmitModal(true);
              }}
              style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
            >
              📝 Submit Candidate Details Manually
            </button>
          </div>
        </div>
      )}

      {/* SUBMIT CUSTOM COMPANY LEAD MODAL */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '560px', borderRadius: '16px', padding: '28px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>🏢 Submit Employer / Hiring Lead</div>
              <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gray-txt)', marginBottom: '16px' }}>
              Submit a company or hiring manager looking for medical coders. Talentera partnerships team will connect and credit your bounty!
            </p>
            <form onSubmit={handleSubmitLead}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  required
                  placeholder="Company Name *"
                  value={employerForm.companyName}
                  onChange={(e) => setEmployerForm({ ...employerForm, companyName: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  required
                  placeholder="Contact Person *"
                  value={employerForm.contactPerson}
                  onChange={(e) => setEmployerForm({ ...employerForm, contactPerson: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Designation (e.g. HR / VP)"
                  value={employerForm.designation}
                  onChange={(e) => setEmployerForm({ ...employerForm, designation: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="City"
                  value={employerForm.city}
                  onChange={(e) => setEmployerForm({ ...employerForm, city: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="email"
                  placeholder="Work Email"
                  value={employerForm.workEmail}
                  onChange={(e) => setEmployerForm({ ...employerForm, workEmail: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number (10 digits) *"
                  maxLength={10}
                  value={employerForm.phone}
                  onChange={(e) => setEmployerForm({ ...employerForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Hiring Needs (e.g. HCC Coders)"
                  value={employerForm.hiringNeeds}
                  onChange={(e) => setEmployerForm({ ...employerForm, hiringNeeds: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Hiring Volume (e.g. 5-10)"
                  value={employerForm.hiringVolume}
                  onChange={(e) => setEmployerForm({ ...employerForm, hiringVolume: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
              <textarea
                placeholder="Additional notes or hiring context..."
                value={employerForm.notes}
                onChange={(e) => setEmployerForm({ ...employerForm, notes: e.target.value })}
                style={{ width: '100%', minHeight: '60px', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}
              />
              <button
                type="submit"
                disabled={submittingLead}
                style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
              >
                {submittingLead ? 'Submitting...' : '📤 Submit Lead to Talentera Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
