import React, { useState, useEffect } from 'react';
import api from '../api/client';

const getCityIcon = (city = '') => {
  const c = (city || '').toLowerCase();
  if (c.includes('remote')) return '🌐';
  if (c.includes('global') || c.includes('us') || c.includes('uae')) return '🌍';
  if (c.includes('kochi') || c.includes('trivandrum') || c.includes('coimbatore') || c.includes('goa')) return '🌴';
  if (c.includes('delhi') || c.includes('ncr')) return '🏛️';
  if (c.includes('vizag') || c.includes('visakhapatnam')) return '⚓';
  if (c.includes('mumbai') || c.includes('pune') || c.includes('bengaluru') || c.includes('bangalore')) return '🌆';
  return '🏙️';
};

export default function BrowseJobsSection({ candidate, applications = [], onApplied }) {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({
    totalOpenings: 0,
    companiesCount: 0,
    matchingCount: 0,
    citiesCount: 0,
    candidateTier: 'Verified',
    newToday: 0,
    newThisWeek: 0,
  });
  const [cityStats, setCityStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [toastMsg, setToastMsg] = useState(null);
  const [toastTone, setToastTone] = useState('success');

  // Filters State
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSalaryBand, setSelectedSalaryBand] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');

  // Quick Filter Toggles
  const [filterMatchProfile, setFilterMatchProfile] = useState(false);
  const [filterSilverPlus, setFilterSilverPlus] = useState(false);
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterWalkIn, setFilterWalkIn] = useState(false);
  const [filterOpenToGlobal, setFilterOpenToGlobal] = useState(false);

  // Expanded JD toggles
  const [expandedJDs, setExpandedJDs] = useState({});

  const showToast = (msg, tone = 'success') => {
    setToastMsg(msg);
    setToastTone(tone);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync applied jobs
  useEffect(() => {
    if (Array.isArray(applications)) {
      const ids = new Set(applications.map(a => a.jobId || a.job?.jobId || a._id));
      setAppliedJobIds(ids);
    }
  }, [applications]);

  // Fetch real database jobs
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/candidate/jobs');
      const loadedJobs = res.data?.jobs || [];
      setJobs(loadedJobs);

      if (res.data?.stats) {
        setStats(res.data.stats);
      } else {
        const totalOpenings = loadedJobs.reduce((sum, j) => sum + (j.openings || 1), 0);
        const uniqueComps = new Set(loadedJobs.map(j => j.company).filter(Boolean)).size;
        const uniqueCities = new Set(loadedJobs.map(j => j.location).filter(Boolean)).size;
        const matchCount = loadedJobs.filter(j => j.isProfileMatch || (j.matchScore && j.matchScore >= 85)).length;

        setStats({
          totalOpenings,
          companiesCount: uniqueComps,
          matchingCount: matchCount,
          citiesCount: uniqueCities,
          candidateTier: candidate?.stage4?.medal || 'Verified',
          newToday: 0,
          newThisWeek: 0,
        });
      }

      if (res.data?.cityStats) {
        setCityStats(res.data.cityStats);
      }
    } catch (err) {
      console.warn('Failed to load candidate jobs from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleApplyToJob = async (job) => {
    const jId = job.jobId || job.id;
    if (appliedJobIds.has(jId)) return;

    try {
      setApplyingJobId(jId);
      const res = await api.post(`/candidate/apply/${jId}`, {
        companyId: job.companyId,
        companyName: job.company,
        roleTitle: job.title,
        salary: job.salary,
        location: job.location,
        workMode: job.mode || job.workMode,
      });

      if (res.data?.success || res.status === 200 || res.status === 201) {
        setAppliedJobIds(prev => new Set([...prev, jId]));
        showToast(`Successfully applied to ${job.title} at ${job.company}!`);
        if (onApplied) onApplied(job);
      }
    } catch (err) {
      console.error('Apply job error:', err);
      const serverMsg = err.response?.data?.message || "";
      const alreadyApplied = err.response?.status === 400 && /already applied/i.test(serverMsg);
      if (alreadyApplied) {
        // The application genuinely exists server-side already - resync local state to match reality
        // instead of leaving the button stuck on "Apply Now".
        setAppliedJobIds(prev => new Set([...prev, jId]));
        showToast(`You've already applied to ${job.title} at ${job.company}.`);
        if (onApplied) onApplied(job);
      } else {
        // Any other failure (score below the eligibility threshold, job no longer active, server
        // error, etc.) is a real failure - show the actual reason and leave the job un-applied so
        // the "Apply Now" button stays truthful and retryable.
        showToast(serverMsg || `Could not submit your application to ${job.company}. Please try again.`, 'error');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleResetFilters = () => {
    setSelectedLocation('');
    setSelectedSpecialty('');
    setSelectedCompany('');
    setSelectedProject('');
    setSelectedSalaryBand('');
    setSelectedWorkMode('');
    setFilterMatchProfile(false);
    setFilterSilverPlus(false);
    setFilterFeatured(false);
    setFilterWalkIn(false);
    setFilterOpenToGlobal(false);
  };

  const toggleExpandJD = (jId) => {
    setExpandedJDs(prev => ({ ...prev, [jId]: !prev[jId] }));
  };

  // One matcher for every filter. `skip` leaves out the named filters so each dropdown /
  // directory / map only offers values that still have jobs under the OTHER active filters
  // (e.g. Work mode = Remote -> a company that only hires onsite disappears everywhere).
  const jobMatches = (job, skip = []) => {
    const on = (key) => !skip.includes(key);
    if (on('location') && selectedLocation && job.location?.toLowerCase() !== selectedLocation.toLowerCase()) return false;
    if (on('specialty') && selectedSpecialty && !String(job.specialty || "").split(" / ").map((s) => s.trim()).includes(selectedSpecialty)) return false;
    if (on('company') && selectedCompany && job.company !== selectedCompany) return false;
    if (on('project') && selectedProject && job.projectClient !== selectedProject) return false;
    if (on('workmode') && selectedWorkMode && (job.workMode || job.mode)?.toLowerCase() !== selectedWorkMode.toLowerCase()) return false;
    if (on('salary') && selectedSalaryBand) {
      if (job.compMin === null || job.compMin === undefined || job.compMin === "") return false;
      const min = Number(job.compMin);
      if (selectedSalaryBand === '<4' && min >= 4) return false;
      if (selectedSalaryBand === '4-6' && (min < 4 || min > 6)) return false;
      if (selectedSalaryBand === '6-9' && (min < 6 || min > 9)) return false;
      if (selectedSalaryBand === '9+' && min < 9) return false;
    }
    // Quick filter toggles
    if (filterMatchProfile && !job.isProfileMatch && (job.matchScore || 0) < 85) return false;
    if (filterSilverPlus && job.minTierRequired === 'Gold') return false;
    if (filterFeatured && !job.isFeatured) return false;
    if (filterWalkIn && !job.isWalkIn) return false;
    if (filterOpenToGlobal && !job.isOpenToGlobal) return false;
    return true;
  };
  const jobsFor = (skipKey) => jobs.filter((j) => jobMatches(j, skipKey ? [skipKey] : []));

  const filteredJobs = jobsFor();

  const uniq = (arr, keep) => {
    const out = Array.from(new Set(arr.filter(Boolean)));
    if (keep && !out.includes(keep)) out.push(keep); // keep a chosen value visible even if it now has no jobs
    return out;
  };
  const locationsList = uniq(jobsFor('location').map((j) => j.location), selectedLocation);
  const specialtiesList = uniq(jobsFor('specialty').flatMap((j) => String(j.specialty || "").split(" / ").map((s) => s.trim())), selectedSpecialty);
  const companyJobs = jobsFor('company');
  const companiesList = uniq(companyJobs.map((j) => j.company), selectedCompany);
  // Always offer these 3 RCM project/client tracks so Billing and AR Calling candidates can filter
  // for their own domain even before a job posted under that department exists in the database.
  const BASE_PROJECT_OPTIONS = ['Coding', 'Billing', 'AR calling'];
  const projectsList = uniq([...BASE_PROJECT_OPTIONS, ...jobsFor('project').map((j) => j.projectClient)], selectedProject);

  // Hiring map: cities that still have jobs under the other filters
  const displayCities = Array.from(new Set(jobsFor('location').map((j) => j.location).filter(Boolean))).map((loc) => {
    const locJobs = jobsFor('location').filter((j) => j.location === loc);
    const locOpenings = locJobs.reduce((sum, j) => sum + (j.openings || 1), 0);
    const locCompanies = new Set(locJobs.map((j) => j.company).filter(Boolean)).size;
    return {
      city: loc,
      count: locOpenings,
      companies: locCompanies,
      icon: getCityIcon(loc),
      tag: locOpenings >= 5 ? '🔥 High hiring' : '✓ Active',
    };
  });

  const anyFilterActive = Boolean(
    selectedLocation || selectedSpecialty || selectedCompany || selectedProject || selectedSalaryBand || selectedWorkMode ||
    filterMatchProfile || filterSilverPlus || filterFeatured || filterWalkIn || filterOpenToGlobal
  );
  const sumOpenings = (list) => list.reduce((sum, j) => sum + (j.openings || 1), 0);
  const directoryJobsCount = sumOpenings(companyJobs);

  const totalOpeningsCount = anyFilterActive ? sumOpenings(filteredJobs) : (stats.totalOpenings || sumOpenings(jobs));
  const totalCompaniesCount = anyFilterActive ? new Set(filteredJobs.map((j) => j.company).filter(Boolean)).size : (stats.companiesCount || companiesList.length);
  const totalMatchingCount = anyFilterActive
    ? filteredJobs.filter((j) => j.isProfileMatch || (j.matchScore && j.matchScore >= 85)).length
    : (stats.matchingCount || jobs.filter((j) => j.isProfileMatch || (j.matchScore && j.matchScore >= 85)).length);
  const totalCitiesCount = anyFilterActive ? new Set(filteredJobs.map((j) => j.location).filter(Boolean)).size : (stats.citiesCount || locationsList.length);

  return (
    <div className="browse-jobs-exact-section" style={{ padding: '24px 32px', background: '#F8FAFC', minHeight: '100%' }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: '#0F1B3D',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontWeight: 700,
          fontSize: 13.5,
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ color: toastTone === 'error' ? '#F87171' : '#F5B41A' }}>{toastTone === 'error' ? '⚠' : '✓'}</span> {toastMsg}
        </div>
      )}

      {/* Header Eyebrow & Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#D97706',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#F5B41A' }}></span>
          LIVE · {totalOpeningsCount} OPEN ROLES ACROSS {totalCompaniesCount} RCM COMPANIES · DATABASE VERIFIED
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0F1B3D', margin: 0, letterSpacing: '-0.02em' }}>
          Browse Jobs · Everything Medical Coding
        </h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: '6px 0 0', maxWidth: 820, lineHeight: 1.5 }}>
          All open roles, all locations, all companies — in ONE place. No jumping to Naukri, Foundit, or LinkedIn. Filter, view full JD, and apply directly with your verified profile.
        </p>
      </div>

      {/* 4 Stats Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        {/* Card 1 */}
        <div style={{
          background: '#FFFDF5',
          border: '1.5px solid #F5B41A',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 2px 6px rgba(245,180,26,0.08)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(245,180,26,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            🔥
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B3D', lineHeight: 1 }}>
              {totalOpeningsCount}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 3 }}>
              Live Openings
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
              {stats.newToday > 0 ? `↑ ${stats.newToday} new today` : 'Verified Active Roles'}
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B3D', lineHeight: 1 }}>
              {totalCompaniesCount}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 3 }}>
              Companies Hiring
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
              {stats.newThisWeek > 0 ? `↑ ${stats.newThisWeek} new this week` : 'Verified Employers'}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#ECFDF5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            🎯
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B3D', lineHeight: 1 }}>
              {totalMatchingCount}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 3 }}>
              Matching Your Profile
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669', marginTop: 2 }}>
              Your {stats.candidateTier || 'Verified'} tier qualifies
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#F5F3FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            flexShrink: 0,
          }}>
            📍
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B3D', lineHeight: 1 }}>
              {totalCitiesCount}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 3 }}>
              Cities Hiring Now
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6366F1', marginTop: 2 }}>
              Pan-India + Global
            </div>
          </div>
        </div>
      </div>

      {/* Navy Filter Panel */}
      <div style={{
        background: 'linear-gradient(135deg, #0F1B3D 0%, #16244D 100%)',
        borderRadius: 14,
        padding: '20px 24px',
        color: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(15,27,61,0.18)',
        marginBottom: 28,
      }}>
        {/* Filter Title & Reset */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: '#F5B41A',
              color: '#0F1B3D',
              width: 26,
              height: 26,
              borderRadius: 6,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
            }}>
              🎛
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>
              Filter Jobs · Only in Talentera
            </span>
          </div>

          <button
            onClick={handleResetFilters}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#F5B41A',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Reset all
          </button>
        </div>

        {/* 6 Filter Dropdowns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}>
          {/* Location */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              📍 LOCATION
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>All Locations ({locationsList.length})</option>
              {locationsList.map((loc) => (
                <option key={loc} value={loc} style={{ color: '#0F1B3D' }}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Specialty */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              🩺 SPECIALTY
            </label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>All Specialties ({specialtiesList.length})</option>
              {specialtiesList.map((sp) => (
                <option key={sp} value={sp} style={{ color: '#0F1B3D' }}>{sp}</option>
              ))}
            </select>
          </div>

          {/* Company */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              🏢 COMPANY
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>All Companies ({companiesList.length})</option>
              {companiesList.map((c) => (
                <option key={c} value={c} style={{ color: '#0F1B3D' }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Project / Client */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              📋 PROJECT / CLIENT
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>All Projects ({projectsList.length})</option>
              {projectsList.map((p) => (
                <option key={p} value={p} style={{ color: '#0F1B3D' }}>{p}</option>
              ))}
            </select>
          </div>

          {/* Salary Band */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              💰 SALARY BAND
            </label>
            <select
              value={selectedSalaryBand}
              onChange={(e) => setSelectedSalaryBand(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>Any Salary</option>
              <option value="<4" style={{ color: '#0F1B3D' }}>&lt; ₹4 LPA</option>
              <option value="4-6" style={{ color: '#0F1B3D' }}>₹4 – ₹6 LPA</option>
              <option value="6-9" style={{ color: '#0F1B3D' }}>₹6 – ₹9 LPA</option>
              <option value="9+" style={{ color: '#0F1B3D' }}>₹9+ LPA</option>
            </select>
          </div>

          {/* Work Mode */}
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#F5B41A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              💼 WORK MODE
            </label>
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="" style={{ color: '#0F1B3D' }}>Any Work Mode</option>
              <option value="Remote" style={{ color: '#0F1B3D' }}>Remote</option>
              <option value="Hybrid" style={{ color: '#0F1B3D' }}>Hybrid</option>
              <option value="On-site" style={{ color: '#0F1B3D' }}>On-site</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Chips Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setFilterMatchProfile(!filterMatchProfile)}
            style={{
              background: filterMatchProfile ? '#F5B41A' : 'rgba(255,255,255,0.1)',
              color: filterMatchProfile ? '#0F1B3D' : '#FFFFFF',
              border: filterMatchProfile ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⭐ Match my profile</span>
            {filterMatchProfile && <span>✕</span>}
          </button>

          <button
            onClick={() => setFilterSilverPlus(!filterSilverPlus)}
            style={{
              background: filterSilverPlus ? '#F5B41A' : 'rgba(255,255,255,0.1)',
              color: filterSilverPlus ? '#0F1B3D' : '#FFFFFF',
              border: filterSilverPlus ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {filterSilverPlus ? '✓ Verified Silver+ only' : '+ Verified Silver+ only'}
          </button>

          <button
            onClick={() => setFilterFeatured(!filterFeatured)}
            style={{
              background: filterFeatured ? '#F5B41A' : 'rgba(255,255,255,0.1)',
              color: filterFeatured ? '#0F1B3D' : '#FFFFFF',
              border: filterFeatured ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {filterFeatured ? '✓ Featured only' : '+ Featured only'}
          </button>

          <button
            onClick={() => setFilterWalkIn(!filterWalkIn)}
            style={{
              background: filterWalkIn ? '#F5B41A' : 'rgba(255,255,255,0.1)',
              color: filterWalkIn ? '#0F1B3D' : '#FFFFFF',
              border: filterWalkIn ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {filterWalkIn ? '✓ Walk-in / Immediate' : '+ Walk-in / Immediate'}
          </button>

          <button
            onClick={() => setFilterOpenToGlobal(!filterOpenToGlobal)}
            style={{
              background: filterOpenToGlobal ? '#F5B41A' : 'rgba(255,255,255,0.1)',
              color: filterOpenToGlobal ? '#0F1B3D' : '#FFFFFF',
              border: filterOpenToGlobal ? 'none' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {filterOpenToGlobal ? '✓ Open to Global' : '+ Open to Global'}
          </button>
        </div>
      </div>

      {/* Section 2: Live Hiring Map — cities & company counts */}
      {displayCities.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🗺️</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F1B3D', margin: 0 }}>
                Live Hiring Map — cities & company counts
              </h2>
              <span style={{
                background: '#FEF3C7',
                color: '#B45309',
                padding: '3px 9px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}>
                {displayCities.length} CITIES ACTIVE
              </span>
            </div>

            <div
              onClick={() => setSelectedLocation('')}
              style={{ fontSize: 12.5, fontWeight: 700, color: '#0F1B3D', cursor: 'pointer' }}
            >
              {selectedLocation ? `Filtering: ${selectedLocation} (Clear ✕)` : 'View interactive map →'}
            </div>
          </div>

          {/* City Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12,
          }}>
            {displayCities.map((item) => {
              const isSelected = selectedLocation.toLowerCase() === item.city.toLowerCase();

              return (
                <div
                  key={item.city}
                  onClick={() => setSelectedLocation(isSelected ? '' : item.city)}
                  style={{
                    background: isSelected ? '#FFFDF5' : '#FFFFFF',
                    border: isSelected ? '2px solid #F5B41A' : '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '14px 14px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 4px 12px rgba(245,180,26,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 110,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0F1B3D' }}>{item.city}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2, fontWeight: 600 }}>
                      {item.count} jobs <span style={{ color: '#CBD5E1' }}>·</span> {item.companies} companies
                    </div>
                  </div>

                  {item.tag && (
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: isSelected ? '#B45309' : '#059669',
                      marginTop: 8,
                    }}>
                      {item.tag}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 3: Company Directory · Live Hiring Status */}
      {companiesList.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F1B3D', margin: 0 }}>
                Company Directory · Live Hiring Status
              </h2>
              <span style={{
                background: '#FEF3C7',
                color: '#B45309',
                padding: '3px 9px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 800,
              }}>
                {companiesList.length} COMPANIES · {directoryJobsCount} JOBS
              </span>
            </div>

            <div
              onClick={() => setSelectedCompany('')}
              style={{ fontSize: 12.5, fontWeight: 700, color: '#0F1B3D', cursor: 'pointer' }}
            >
              {selectedCompany ? `Filtering: ${selectedCompany} (Show all ✕)` : `View all ${companiesList.length} →`}
            </div>
          </div>

          {/* Company Quick-Filter Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {companiesList.map((comp) => {
              const isCompSelected = selectedCompany === comp;
              return (
                <button
                  key={comp}
                  onClick={() => setSelectedCompany(isCompSelected ? '' : comp)}
                  style={{
                    background: isCompSelected ? '#0F1B3D' : '#FFFFFF',
                    color: isCompSelected ? '#FFFFFF' : '#334155',
                    border: isCompSelected ? '1px solid #0F1B3D' : '1px solid #CBD5E1',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🏢</span>
                  <span>{comp}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4: Live Job Postings List */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: '#0F1B3D',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}>
              💼
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F1B3D', margin: 0 }}>
              Live Job Postings
            </h2>
            <span style={{
              background: '#ECFDF5',
              color: '#059669',
              border: '1px solid #A7F3D0',
              padding: '2px 8px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 800,
            }}>
              {filteredJobs.length} OPEN
            </span>
          </div>

          {(selectedLocation || selectedSpecialty || selectedCompany || selectedSalaryBand || selectedWorkMode || filterMatchProfile) && (
            <button
              onClick={handleResetFilters}
              style={{ background: 'transparent', border: 'none', color: '#D97706', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Clear all filters ✕
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Loading live verified jobs from database...</div>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredJobs.map((job) => {
              const jId = job.jobId || job.id;
              const isApplied = appliedJobIds.has(jId);
              const isExpanded = !!expandedJDs[jId];

              return (
                <div
                  key={jId}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #F5B41A',
                    borderRadius: 12,
                    padding: '20px 22px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
                      {/* Company Avatar */}
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: 10,
                        background: '#0F1B3D',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {(job.company || 'C')[0].toUpperCase()}
                      </div>

                      <div>
                        {/* Title and Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 16.5, fontWeight: 800, color: '#0F1B3D', margin: 0 }}>
                            {job.title}
                          </h3>
                          {isApplied && (
                            <span style={{
                              background: '#059669',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}>
                              ✓ APPLIED
                            </span>
                          )}
                          {job.matchScore >= 90 && (
                            <span style={{
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}>
                              ⭐ {job.matchScore}% Match
                            </span>
                          )}
                          {job.isWalkIn && (
                            <span style={{
                              background: '#FEF3C7',
                              color: '#B45309',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 10.5,
                              fontWeight: 800,
                            }}>
                              ⚡ Immediate Walk-in
                            </span>
                          )}
                        </div>

                        {/* Metadata line */}
                        <div style={{
                          fontSize: 12.5,
                          color: '#64748B',
                          marginTop: 6,
                          display: 'flex',
                          gap: 14,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}>
                          <span>🏢 <b style={{ color: '#1E293B' }}>{job.company}</b></span>
                          <span>📍 {job.location} {job.mode ? `· ${job.mode}` : ''}</span>
                          <span>💰 <b style={{ color: '#059669' }}>{job.salary}</b></span>
                          {job.specialty && <span>📋 {job.specialty}</span>}
                          {job.experience && <span>🧩 {job.experience}</span>}
                          {job.openings && <span>👥 {job.openings} Openings</span>}
                        </div>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => toggleExpandJD(jId)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? 'Hide JD ▲' : 'View Full JD ▼'}
                      </button>

                      <button
                        disabled={isApplied || applyingJobId === jId}
                        onClick={() => handleApplyToJob(job)}
                        style={{
                          background: isApplied ? '#E2E8F0' : '#F5B41A',
                          color: isApplied ? '#94A3B8' : '#0F1B3D',
                          padding: '10px 22px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 800,
                          border: 'none',
                          cursor: isApplied ? 'default' : 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: isApplied ? 'none' : '0 2px 8px rgba(245,180,26,0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isApplied ? '✓ Applied' : (applyingJobId === jId ? 'Applying…' : '📤 Apply Now')}
                      </button>
                    </div>
                  </div>

                  {/* Must-Haves / Certs Required chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {job.isFresherOnly && (
                      <span style={{ background: '#ECFDF5', color: '#047857', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        🎓 Freshers welcome
                      </span>
                    )}
                    {(job.certsRequired || []).map((cert) => (
                      <span key={cert} style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                        🎓 {cert} Required
                      </span>
                    ))}
                    {job.projectClient && (
                      <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4 }}>
                        🏥 Client: {job.projectClient}
                      </span>
                    )}
                  </div>

                  {/* Expandable Full JD Section */}
                  {isExpanded && (
                    <div style={{
                      marginTop: 14,
                      padding: '14px 16px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: '#475569',
                      lineHeight: 1.6,
                    }}>
                      <div style={{ fontWeight: 800, color: '#0F1B3D', marginBottom: 4 }}>
                        📋 Detailed Job Description & Requirements:
                      </div>
                      {job.description && <p style={{ margin: '0 0 8px' }}>{job.description}</p>}
                      {Array.isArray(job.jobDetails) && job.jobDetails.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '0 0 8px' }}>
                          {job.jobDetails.map((d) => (
                            <div key={d.label}><b style={{ color: '#334155' }}>{d.label}:</b> {d.value}</div>
                          ))}
                        </div>
                      )}
                      {!job.description && !job.mustHaves && (!job.jobDetails || job.jobDetails.length === 0) && (
                        <p style={{ margin: 0, fontStyle: 'italic' }}>The employer hasn&apos;t added more details for this role.</p>
                      )}
                      {job.mustHaves && (
                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>
                          <b>Key Must-Haves:</b> {job.mustHaves}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: '#FFFFFF',
            border: '1.5px dashed #CBD5E1',
            borderRadius: 14,
            padding: '48px 24px',
            textAlign: 'center',
            maxWidth: 550,
            margin: '20px auto',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F1B3D', margin: '0 0 6px' }}>
              No open jobs match your filters
            </h3>
            <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 16px' }}>
              {jobs.length === 0
                ? 'There are currently no active job postings published in the database.'
                : 'Try adjusting your specialty, location, or reset the filters to browse all openings.'}
            </p>
            {jobs.length > 0 && (
              <button
                onClick={handleResetFilters}
                style={{
                  background: '#0F1B3D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
