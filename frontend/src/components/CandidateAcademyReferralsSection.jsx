import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/client';

export default function CandidateAcademyReferralsSection({
  candidate,
  referralsData,
  onRefresh,
  triggerToast,
}) {
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [activeAcademyModal, setActiveAcademyModal] = useState(null);
  const [academies, setAcademies] = useState([]);
  const [loadingAcademies, setLoadingAcademies] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  const [courseFilter, setCourseFilter] = useState('All');
  const [bonusFilter, setBonusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [languageFilter, setLanguageFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(6);

  const [academyForm, setAcademyForm] = useState({
    studentName: '',
    studentEmail: '',
    studentMobile: '',
    course: '',
    batchPreference: '',
    notes: '',
  });
  const [submittingLead, setSubmittingLead] = useState(false);

  // Fetch real partner academies from MongoDB
  useEffect(() => {
    let isMounted = true;
    const fetchAcademies = async () => {
      setLoadingAcademies(true);
      try {
        const res = await api.get('/candidate/academies');
        if (isMounted && res.data?.academies) {
          setAcademies(res.data.academies);
        }
      } catch (err) {
        console.error('Failed to load academies', err);
      } finally {
        if (isMounted) setLoadingAcademies(false);
      }
    };
    fetchAcademies();
    return () => { isMounted = false; };
  }, []);

  const academyReferrals = referralsData?.academyReferrals || [];
  const candidateStage2Academy = candidate?.stage2?.academyName || candidate?.stage2?.instituteName || '';
  const candidateName = candidate?.stage1?.fullname || candidate?.stage1?.fullName || candidate?.fullname || 'Candidate';
  const candidateSlug = candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Compute real metrics from candidate's database academy referrals
  const paidReferrals = academyReferrals.filter((r) => r.status === 'PAID' || r.status === 'COMPLETED');
  const inProgressReferrals = academyReferrals.filter((r) => r.status !== 'PAID' && r.status !== 'COMPLETED' && r.status !== 'REJECTED');
  const lifetimeEarnedInr = paidReferrals.reduce((acc, r) => acc + (parseInt(String(r.commission || '2500').replace(/[^0-9]/g, '')) || 2500), 0);
  const inProgressInr = inProgressReferrals.reduce((acc, r) => acc + (parseInt(String(r.commission || '2500').replace(/[^0-9]/g, '')) || 2500), 0);
  const enrolledTotal = academyReferrals.length;
  const loyaltyPointsEarned = enrolledTotal * 500;

  // Enrich real academies from MongoDB with candidate Stage 2 alumni badges
  const partnerAcademies = useMemo(() => {
    return academies.map((acad, idx) => {
      const isMyAcademy = candidateStage2Academy && acad.name && acad.name.toLowerCase().includes(candidateStage2Academy.toLowerCase());
      const logoGradients = [
        'linear-gradient(135deg, #6366F1, #4F46E5)',
        'linear-gradient(135deg, #10B981, #059669)',
        'linear-gradient(135deg, #EF4444, #DC2626)',
        'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        'linear-gradient(135deg, #F59E0B, #D97706)',
      ];
      return {
        id: acad.id || acad._id || `acad-${idx}`,
        name: acad.name || 'Medical Coding Institute',
        city: acad.city || 'Pan-India',
        course: acad.course || acad.specialty || 'Medical Coding',
        courseDesc: acad.courseDesc || `${acad.specialty || 'Medical Coding'} Certification & Training`,
        alumni: acad.alumni ? `${acad.alumni}` : '100+ alumni',
        founded: acad.founded || '2020',
        bonus: acad.bonus || '₹3,000',
        bonusNum: acad.bonusNum || 3000,
        paymentMethod: acad.paymentMethod || 'direct',
        paymentLabel: acad.paymentLabel || '🅰 Direct pay · 0% fee',
        badge: isMyAcademy ? '🌟 MY ACADEMY (ALUMNI)' : (acad.tier || null),
        badgeColor: isMyAcademy ? 'var(--gold)' : 'var(--blue)',
        logoLetter: acad.name ? acad.name.charAt(0).toUpperCase() : '🏫',
        logoBg: logoGradients[idx % logoGradients.length],
        language: acad.language || 'English',
        isMyAcademy,
      };
    });
  }, [academies, candidateStage2Academy]);

  // Featured academy: Candidate's Stage 2 Academy or the first partner academy
  const featuredAcademy = useMemo(() => {
    if (partnerAcademies.length === 0) return null;
    const myAcad = partnerAcademies.find((a) => a.isMyAcademy);
    return myAcad || partnerAcademies[0];
  }, [partnerAcademies]);

  // Dynamic filter options based on real database records
  const dynamicCities = useMemo(() => ['All', ...new Set(partnerAcademies.map((a) => a.city).filter(Boolean))], [partnerAcademies]);
  const dynamicCourses = useMemo(() => ['All', ...new Set(partnerAcademies.map((a) => a.course).filter(Boolean))], [partnerAcademies]);
  const dynamicLanguages = useMemo(() => ['All', ...new Set(partnerAcademies.map((a) => a.language).filter(Boolean))], [partnerAcademies]);

  const filteredAcademies = useMemo(() => {
    return partnerAcademies.filter((acad) => {
      if (cityFilter !== 'All' && !acad.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (courseFilter !== 'All' && !acad.course.toLowerCase().includes(courseFilter.toLowerCase())) return false;
      if (paymentFilter === 'direct' && acad.paymentMethod !== 'direct') return false;
      if (paymentFilter === 'talentera' && acad.paymentMethod !== 'talentera') return false;
      if (languageFilter !== 'All' && acad.language !== languageFilter) return false;
      if (bonusFilter === 'high' && acad.bonusNum < 3500) return false;
      if (bonusFilter === 'mid' && (acad.bonusNum < 2500 || acad.bonusNum > 3500)) return false;
      return true;
    });
  }, [partnerAcademies, cityFilter, courseFilter, paymentFilter, languageFilter, bonusFilter]);

  const handleOpenReferralModal = (acad) => {
    setActiveAcademyModal(acad);
    setAcademyForm((prev) => ({ ...prev, course: acad.course }));
  };

  const handleCopyAcademyLink = (acad) => {
    const link = `https://talentera.io/academy/${acad.id}/${candidateSlug}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      triggerToast(`Referral link for ${acad.name} copied to clipboard!`);
    } else {
      triggerToast('Referral link: ' + link);
    }
  };

  const handleSubmitStudentLead = async (e) => {
    if (e) e.preventDefault();
    if (!academyForm.studentName || !academyForm.studentMobile || !academyForm.course) {
      triggerToast('Student name, mobile, and course of interest are required.');
      return;
    }
    setSubmittingLead(true);
    try {
      const res = await api.post('/candidate/referrals/submit-academy', academyForm);
      triggerToast(res.data?.message || 'Academy referral logged successfully!');
      setAcademyForm({
        studentName: '',
        studentEmail: '',
        studentMobile: '',
        course: '',
        batchPreference: '',
        notes: '',
      });
      setShowDirectForm(false);
      setActiveAcademyModal(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not submit academy referral.');
    } finally {
      setSubmittingLead(false);
    }
  };

  return (
    <div className="page active" id="page-academy-referrals">
      {/* PAGE HEADER */}
      <div className="page-head">
        <div className="page-eyebrow">🏫 Refer friends to training academies · Earn direct cash + loyalty pts</div>
        <h1 className="page-title">Refer to Academy</h1>
        <p className="page-sub">
          Know someone thinking about medical coding? Refer them to any Talentera-partner academy. Big academies pay you DIRECTLY (₹2,500-4,000). Smaller academies route through Talentera (15% platform fee for payment infra). You choose which academy to share.
        </p>
      </div>

      {/* EARNINGS SUMMARY BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #E0F2FE, #F0F9FF)', border: '2px solid #0EA5E9', borderRadius: '18px', padding: '24px 28px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#0284C7', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>💰 Lifetime Earnings</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>₹{lifetimeEarnedInr.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>{paidReferrals.length} paid · direct UPI</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#0284C7', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>In Progress</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>₹{inProgressInr.toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>{inProgressReferrals.length} enrolled, waiting Day-30 gate</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--gold-deep)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>🎁 Loyalty Pts</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '6px' }}>{loyaltyPointsEarned.toLocaleString()} pts</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>500 pts per enrollment</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--navy)', fontSize: '10.5px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>📊 Enrolled Total</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--navy)', marginTop: '6px' }}>{enrolledTotal}</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>Across partner academies</div>
          </div>
        </div>
      </div>

      {/* HOW ACADEMIES PAY (TWO OPTIONS) */}
      <div style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '2px solid var(--gold)', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px' }}>💡 How academies pay referral bonuses · Two models</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--green)' }}>🅰 Option A · Academy Pays DIRECT</div>
              <span style={{ background: 'var(--green)', color: 'var(--white)', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>₹0 FEE</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-txt)', lineHeight: 1.6 }}>
              Large academies (Apex, Simplilearn, MedLearn) pay you <b>₹2,500 - ₹4,000</b> directly via UPI. Talentera takes 0% fee. Plus <b>500 loyalty pts</b> as engagement bonus.
            </div>
          </div>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--blue)' }}>🅱 Option B · Via Talentera</div>
              <span style={{ background: 'var(--blue)', color: 'var(--white)', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800' }}>15% FEE</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray-txt)', lineHeight: 1.6 }}>
              Small academies send ₹3,000 to Talentera → we hold 15% (₹450) for payment infra + Day-30 audit → you get <b>₹2,550</b> to UPI in 7 days. Plus <b>500 loyalty pts</b>.
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED ACADEMY */}
      {featuredAcademy && (
        <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '2px solid var(--green)', borderRadius: '16px', padding: '22px 26px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--green)', color: 'var(--white)', padding: '6px 18px', borderRadius: '0 0 0 12px', fontSize: '11px', fontWeight: '800', letterSpacing: '.5px' }}>
            {featuredAcademy.isMyAcademy ? '🌟 YOUR VERIFIED ACADEMY' : '⭐ FEATURED PARTNER'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '18px', alignItems: 'center' }}>
            <div style={{ width: '68px', height: '68px', background: featuredAcademy.logoBg || 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'var(--white)', borderRadius: '16px', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '26px' }}>
              {featuredAcademy.logoLetter || '🏫'}
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {featuredAcademy.isMyAcademy ? 'STAGE 2 ALUMNI · REFER BATCH-MATES' : 'TOP VERIFIED PARTNER · INSTANT UPI'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginTop: '4px' }}>
                {featuredAcademy.name} · {featuredAcademy.city}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-txt)', marginTop: '4px' }}>
                {featuredAcademy.courseDesc} · {featuredAcademy.alumni}
              </div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--white)', padding: '14px 20px', borderRadius: '14px', border: '2px solid var(--green)' }}>
              <div style={{ fontSize: '9px', color: 'var(--green)', fontWeight: '800', letterSpacing: '.5px' }}>DIRECT BONUS</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy)', margin: '2px 0' }}>{featuredAcademy.bonus}</div>
              <div style={{ fontSize: '9.5px', color: 'var(--gray-mute)' }}>+ 500 pts · {featuredAcademy.paymentMethod === 'direct' ? 'Option A' : 'Option B'}</div>
              <button
                onClick={() => handleOpenReferralModal(featuredAcademy)}
                style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer', marginTop: '8px' }}
              >
                📤 Refer Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>📍 City</label>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            {dynamicCities.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>🎯 Course Type</label>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            {dynamicCourses.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Courses' : c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>💰 Bonus Band</label>
          <select value={bonusFilter} onChange={(e) => setBonusFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            <option value="All">All Bands</option>
            <option value="mid">₹2,500 - ₹3,500</option>
            <option value="high">₹3,500 - ₹4,500+</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>💳 Payment Model</label>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            <option value="All">Any Model</option>
            <option value="direct">🅰 Direct Pay (0% Fee)</option>
            <option value="talentera">🅱 Via Talentera (15% Fee)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--gold-deep)', fontWeight: '800', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>🗣 Language</label>
          <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', background: 'var(--white)', cursor: 'pointer' }}>
            {dynamicLanguages.map((l) => (
              <option key={l} value={l}>{l === 'All' ? 'All Languages' : l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ACADEMY CARDS GRID */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">🏫</div>Partner Training Academies <span className="count">{filteredAcademies.length} AVAILABLE</span>
          </div>
          <button
            onClick={() => setShowDirectForm(true)}
            style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '6px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
          >
            + Refer Student Directly
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {filteredAcademies.slice(0, visibleCount).map((acad) => (
            <div
              key={acad.id}
              className="card"
              style={{
                padding: '18px',
                marginBottom: 0,
                borderLeft: `4px solid ${acad.paymentMethod === 'direct' ? 'var(--green)' : 'var(--blue)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ width: '52px', height: '52px', background: acad.logoBg, color: 'var(--white)', borderRadius: '14px', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '20px' }}>
                  {acad.logoLetter}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)' }}>{acad.name}</div>
                    {acad.badge && (
                      <span style={{ background: acad.badgeColor, color: 'var(--navy)', padding: '2px 6px', borderRadius: '5px', fontSize: '9px', fontWeight: '800' }}>
                        {acad.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>
                    {acad.city} · {acad.language} · {acad.alumni}
                  </div>
                </div>
                <div style={{ textAlign: 'center', background: acad.paymentMethod === 'direct' ? 'var(--green-soft)' : 'var(--blue-soft)', padding: '6px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '9px', color: acad.paymentMethod === 'direct' ? 'var(--green)' : 'var(--blue)', fontWeight: '800' }}>
                    {acad.paymentMethod === 'direct' ? 'DIRECT' : 'VIA TT'}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--navy)' }}>{acad.bonus}</div>
                </div>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', marginBottom: '10px', lineHeight: 1.5 }}>
                {acad.courseDesc}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                <span style={{ fontSize: '10.5px', color: acad.paymentMethod === 'direct' ? 'var(--green)' : 'var(--blue)', fontWeight: '800' }}>
                  {acad.paymentLabel}
                </span>
                <button
                  onClick={() => handleOpenReferralModal(acad)}
                  style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '7px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
                >
                  📤 Refer Friend
                </button>
              </div>
            </div>
          ))}
        </div>

        {visibleCount < filteredAcademies.length && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              style={{ background: 'var(--white)', color: 'var(--navy)', padding: '12px 26px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: '2px solid var(--gold)', cursor: 'pointer' }}
            >
              Load more partner academies →
            </button>
          </div>
        )}
      </div>

      {/* MY ACADEMY REFERRAL TRACKER */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">📊</div>My Academy Referral Tracker <span className="count">{academyReferrals.length} LOGGED</span>
          </div>
          <button
            onClick={() => setShowDirectForm(true)}
            style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
          >
            + Refer student →
          </button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {academyReferrals.length > 0 ? (
            academyReferrals.map((ref) => (
              <div key={ref.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 140px auto auto', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: 'var(--white)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '14px' }}>
                  {(ref.studentName || 'ST').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '13.5px' }}>
                    {ref.studentName} → {ref.course}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>
                    {ref.studentMobile} · {ref.batchPreference || 'Flexible batch'} · {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                  </div>
                </div>
                <span style={{ background: ref.status === 'PAID' ? 'var(--green-soft)' : 'var(--amber-soft)', color: ref.status === 'PAID' ? 'var(--green)' : 'var(--amber)', padding: '5px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: '800', textAlign: 'center' }}>
                  {ref.status === 'PAID' ? '✓ PAID · Direct' : ref.status || '🟡 Day-30 gate'}
                </span>
                <span style={{ color: ref.status === 'PAID' ? 'var(--green)' : 'var(--navy)', fontWeight: '800', fontSize: '13.5px' }}>
                  +{ref.commission || '₹2,500'}
                </span>
                <span style={{ color: 'var(--gold-deep)', fontWeight: '800', fontSize: '12px' }}>
                  +500 pts
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏫</div>
              <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '15px' }}>No academy student referrals logged yet</div>
              <p style={{ color: 'var(--gray-mute)', fontSize: '12.5px', maxWidth: '440px', margin: '6px auto 16px' }}>
                Refer friends or students to any medical coding academy. Earn up to ₹4,000 direct UPI bonus per enrolled student!
              </p>
              <button
                onClick={() => setShowDirectForm(true)}
                style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '12.5px', border: 'none', cursor: 'pointer' }}
              >
                ➕ Refer a Student Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* HOW ACADEMY REFERRALS WORK (3 STEPS) */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '1.5px solid var(--gold)', padding: '22px 26px', marginTop: '20px' }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          💡 How Academy Referrals work · 3 steps
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gold-soft)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              1
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Share academy link</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              Pick any partner academy card. Click "📤 Refer Friend" → get your tracked link or share directly via WhatsApp.
            </div>
          </div>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--gold-soft)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--gold)', color: 'var(--navy)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              2
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Friend enrolls</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              Friend connects with the academy counselor, selects their batch, and enrolls in the medical coding program.
            </div>
          </div>
          <div style={{ background: 'var(--white)', padding: '16px', borderRadius: '12px', border: '1px solid var(--green)', borderTop: '3px solid var(--green)' }}>
            <div style={{ width: '36px', height: '36px', background: 'var(--green)', color: 'var(--white)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '16px', marginBottom: '10px' }}>
              3
            </div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Day-30 gate → You get paid</div>
            <div style={{ fontSize: '11.5px', color: 'var(--gray-txt)', lineHeight: 1.5 }}>
              After 30 days of active attendance, the academy disburses your bounty. <b>Option A: direct UPI. Option B: via Talentera in 7 days.</b>
            </div>
          </div>
        </div>
      </div>

      {/* ACADEMY REFERRAL MODAL */}
      {activeAcademyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setActiveAcademyModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px' }}>Refer to {activeAcademyModal.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: '700', marginBottom: '16px' }}>
              Academy Bonus: {activeAcademyModal.bonus} direct · Talentera adds 500 loyalty pts
            </div>
            <div style={{ background: 'var(--gold-pale)', border: '1.5px solid var(--gold)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '800', color: 'var(--navy)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                talentera.io/academy/{activeAcademyModal.id}/{candidateSlug}
              </span>
              <button
                onClick={() => handleCopyAcademyLink(activeAcademyModal)}
                style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                📋 Copy Link
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={() => {
                  const text = `Check out ${activeAcademyModal.name} (${activeAcademyModal.city}) for medical coding certification! Register with my referral link: https://talentera.io/academy/${activeAcademyModal.id}/${candidateSlug}`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                }}
                style={{ background: '#25D366', color: 'var(--white)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                💬 WhatsApp Share
              </button>
              <button
                onClick={() => {
                  const text = `I recommend ${activeAcademyModal.name} for Medical Coding training: https://talentera.io/academy/${activeAcademyModal.id}/${candidateSlug}`;
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://talentera.io/academy/' + activeAcademyModal.id + '/' + candidateSlug)}`, '_blank');
                }}
                style={{ background: '#0A66C2', color: 'var(--white)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                💼 LinkedIn Share
              </button>
            </div>
            <button
              onClick={() => {
                setActiveAcademyModal(null);
                setShowDirectForm(true);
              }}
              style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
            >
              📝 Fill Student Details for Direct Callback
            </button>
          </div>
        </div>
      )}

      {/* REFER STUDENT DIRECT MODAL */}
      {showDirectForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>🏫 Refer a Student to Academy</div>
              <button onClick={() => setShowDirectForm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gray-txt)', marginBottom: '16px' }}>
              Submit a friend or student lead. Our academy counseling team will reach out within 24 hours.
            </p>
            <form onSubmit={handleSubmitStudentLead}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  required
                  placeholder="Student Name *"
                  value={academyForm.studentName}
                  onChange={(e) => setAcademyForm({ ...academyForm, studentName: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="tel"
                  required
                  placeholder="Student Mobile *"
                  value={academyForm.studentMobile}
                  onChange={(e) => setAcademyForm({ ...academyForm, studentMobile: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="email"
                  placeholder="Student Email"
                  value={academyForm.studentEmail}
                  onChange={(e) => setAcademyForm({ ...academyForm, studentEmail: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  required
                  placeholder="Course (e.g. HCC / CPC) *"
                  value={academyForm.course}
                  onChange={(e) => setAcademyForm({ ...academyForm, course: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Batch Preference (e.g. Weekend / Morning)"
                  value={academyForm.batchPreference}
                  onChange={(e) => setAcademyForm({ ...academyForm, batchPreference: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', gridColumn: 'span 2' }}
                />
              </div>
              <textarea
                placeholder="Notes (educational background, city, etc.)..."
                value={academyForm.notes}
                onChange={(e) => setAcademyForm({ ...academyForm, notes: e.target.value })}
                style={{ width: '100%', minHeight: '60px', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}
              />
              <button
                type="submit"
                disabled={submittingLead}
                style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
              >
                {submittingLead ? 'Submitting...' : '📤 Submit Student Referral'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
