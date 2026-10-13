import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

// Candidate-facing "Company Full Details" tab. Everything shown here is pulled from what each
// company's HR entered in the company dashboard (Company Profile onboarding stage).
const row = (label, value) =>
  value ? (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#0F1B3D', lineHeight: 1.55, marginTop: 3 }}>{value}</div>
    </div>
  ) : null;

const chips = (label, list) =>
  list && list.length > 0 ? (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {list.map((x) => (
          <span key={x} style={{ background: '#FAFAF8', border: '1px solid #E2E8F0', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700, color: '#0F1B3D' }}>{x}</span>
        ))}
      </div>
    </div>
  ) : null;

export default function CompanyFullDetails() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get('/candidate/company-profiles')
      .then((r) => { if (alive) setCompanies(r.data?.companies || []); })
      .catch(() => { if (alive) setError('Could not load company details right now. Please try again.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      [c.name, c.headquarters, ...(c.branches || []), ...(c.departments || [])].join(' ').toLowerCase().includes(q)
    );
  }, [companies, query]);

  return (
    <div className="page active" id="page-companydetails">
      <div className="page-head">
        <div className="page-eyebrow">Know the company before you apply</div>
        <h1 className="page-title">Company Full Details</h1>
        <p className="page-sub">Mission, departments, size, branches and benefits — shared directly by each company's HR team.</p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by company, city or department…"
        style={{ width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', marginBottom: 18, fontSize: 14 }}
      />

      {loading && <div style={{ padding: 30, color: '#64748B' }}>Loading company details…</div>}
      {!loading && error && <div style={{ padding: 30, color: '#B91C1C' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#64748B' }}>No company details available yet.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map((c) => (
          <div key={c.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {c.logo ? (
                <img src={c.logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', border: '1px solid #E2E8F0' }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0F1B3D', color: '#F5B41A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>
                  {(c.name || 'C')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F1B3D' }}>{c.name}</div>
                {(c.headquarters || c.yearEstablished) && (
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                    {[c.headquarters, c.yearEstablished ? `Est. ${c.yearEstablished}` : ''].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </div>
            {row('Mission & Vision', c.mission || c.about)}
            {chips('Departments', c.departments)}
            {row('Company size', c.size ? `${c.size} employees` : '')}
            {chips('Branches', c.branches)}
            {(c.operatingAddresses || []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>Office addresses</div>
                {c.operatingAddresses.map((a, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#0F1B3D', lineHeight: 1.5, marginTop: 4 }}>
                    {a.branch && <strong>{a.branch}: </strong>}{a.address}
                  </div>
                ))}
              </div>
            )}
            {chips('Policies & benefits', c.policies)}
            {c.website && (
              <div style={{ marginTop: 12 }}>
                <a href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-deep, #B45309)' }}>Visit website →</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
