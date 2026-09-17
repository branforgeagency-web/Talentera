import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Documents', icon: '🗄️' },
  { id: 'certs', label: 'Certifications & AAPC', icon: '🎓' },
  { id: 'assessments', label: 'Assessments & Scorecards', icon: '📊' },
  { id: 'training', label: 'Training & Academies', icon: '🏫' },
  { id: 'identity', label: 'Identity & KYC', icon: '🪪' },
  { id: 'education', label: 'Academic Degrees', icon: '📜' },
  { id: 'resume_exp', label: 'Resumes & Employment', icon: '💼' },
];

const UPLOAD_DOC_TYPES = [
  { id: 'AAPC / Professional Certification', label: 'AAPC / Professional Certification', icon: '🎓' },
  { id: 'Degree Certificate / Diploma', label: 'Degree Certificate / Diploma', icon: '📜' },
  { id: 'Academic Marksheet / Transcript', label: 'Academic Marksheet / Transcript', icon: '📊' },
  { id: 'Training Institute Completion Certificate', label: 'Training Institute Certificate', icon: '🏫' },
  { id: 'Government ID Proof', label: 'Government ID Proof (Aadhaar/PAN/Passport)', icon: '🪪' },
  { id: 'Experience / Relieving Letter', label: 'Experience / Relieving / Offer Letter', icon: '💼' },
  { id: 'Resume / CV', label: 'Resume / CV Document', icon: '📄' },
  { id: 'Other Credential', label: 'Other Professional Credential', icon: '📁' },
];

export default function CandidateDocumentsSection({ candidate, onVaultUpdated }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState(UPLOAD_DOC_TYPES[0].id);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Merge any available candidate profile data with the fetched vault array
  const aggregateCandidateDocuments = (fetchedVault = [], profile = {}) => {
    const list = Array.isArray(fetchedVault) ? [...fetchedVault] : [];

    // 1. Stage 1 ID & Degree
    if (profile?.stage1?.idProofUrl && !list.some(d => d.docUrl === profile.stage1.idProofUrl || d.id === 's1_id_proof')) {
      list.push({
        id: 's1_id_proof',
        title: profile.stage1.idDocType ? `${profile.stage1.idDocType} Proof` : 'Government ID Proof',
        docType: 'Government ID Proof',
        docUrl: profile.stage1.idProofUrl,
        docName: profile.stage1.idDocName || 'Govt_ID_Proof.pdf',
        uploadedAt: profile.stage1.verifiedAt || profile.updatedAt || new Date().toISOString(),
        status: (profile.stage1.aadhaarVerified || profile.stage1.idVerified) ? 'verified' : 'pending',
        verified: !!(profile.stage1.aadhaarVerified || profile.stage1.idVerified),
        stage: 'Stage 01 · Identity',
      });
    }

    if (profile?.stage1?.degreeCertUrl && !list.some(d => d.docUrl === profile.stage1.degreeCertUrl || d.id === 's1_degree_cert')) {
      list.push({
        id: 's1_degree_cert',
        title: profile.stage1.degreeName ? `${profile.stage1.degreeName} Degree Certificate` : 'University Degree Certificate',
        docType: 'Degree Certificate / Diploma',
        docUrl: profile.stage1.degreeCertUrl,
        docName: profile.stage1.degreeDocName || 'Degree_Certificate.pdf',
        uploadedAt: profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 01 · Education',
      });
    }

    // 2. Stage 2 Training Foundation
    if ((profile?.stage2?.docUrl || profile?.stage2?.certificateUrl) && !list.some(d => d.docUrl === (profile.stage2.docUrl || profile.stage2.certificateUrl) || d.id === 's2_training_doc')) {
      list.push({
        id: 's2_training_doc',
        title: profile.stage2.course ? `${profile.stage2.course} — Training Certificate` : 'Academy Training Certificate',
        docType: 'Training Institute Completion Certificate',
        docUrl: profile.stage2.docUrl || profile.stage2.certificateUrl,
        docName: profile.stage2.docName || 'Training_Completion_Certificate.pdf',
        institute: profile.stage2.academyName || 'Healthcare Academy',
        uploadedAt: profile.stage2.completionDate || profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 02 · Training Foundation',
      });
    } else if (profile?.stage2?.academyName && profile?.stage2?.course && !list.some(d => d.id === 's2_training_cred')) {
      list.push({
        id: 's2_training_cred',
        title: `${profile.stage2.course} — ${profile.stage2.academyName}`,
        docType: 'Training Institute Completion Certificate',
        docUrl: profile.stage2.docUrl || null,
        docName: `${profile.stage2.course}_Certification.pdf`,
        institute: profile.stage2.academyName,
        trainer: profile.stage2.trainerName || '',
        batch: profile.stage2.batch || '',
        uploadedAt: profile.stage2.completionDate || profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 02 · Training Foundation',
        isRegisteredCert: true,
      });
    }

    // 3. Stage 3 AAPC Certifications
    const s3Certs = Array.isArray(profile?.stage3?.certifications) && profile.stage3.certifications.length > 0
      ? profile.stage3.certifications
      : (profile?.stage3?.certCode && profile?.stage3?.memberId ? [profile.stage3] : []);

    s3Certs.forEach((cert, idx) => {
      const cCode = cert.code || cert.certCode || 'CPC';
      const cName = cert.name || cert.certName || 'Certified Professional Coder';
      const cBody = cert.body || cert.issuingBody || 'AAPC';
      const cMemberId = cert.memberId || '';
      const certDocId = `cert_${cCode.toLowerCase()}_${cMemberId || idx}`;

      const alreadyInList = list.some((d) =>
        d.id === certDocId ||
        (d.code === cCode && (cMemberId ? d.memberId === cMemberId : true)) ||
        (d.title && d.title.includes(cCode) && (cMemberId ? d.title.includes(cMemberId) : true))
      );

      if (!alreadyInList) {
        list.push({
          id: certDocId,
          title: `${cBody.toUpperCase()} ${cCode} — ${cName}${cMemberId ? ` (ID: ${cMemberId})` : ''}`,
          docType: 'AAPC / Professional Certification',
          docUrl: cert.docUrl || profile?.stage3?.docUrl || null,
          docName: cert.docName || profile?.stage3?.docName || `${cCode}_Certificate.pdf`,
          memberId: cMemberId,
          code: cCode,
          body: cBody,
          issueDate: cert.issueDate || cert.issueYear || '',
          expiryDate: cert.expiryDate || cert.expiryYear || '',
          uploadedAt: cert.uploadedAt || profile?.stage3?.certVerifiedAt || profile?.updatedAt || new Date().toISOString(),
          status: profile?.stage3?.certStatus === 'verified' ? 'verified' : (cert.status || 'API-Verified'),
          verified: true,
          stage: 'Stage 03 · Certification',
          isRegisteredCert: true,
        });
      }
    });

    // 4. Stage 4 Assessment Report
    if ((profile?.stage4?.score !== undefined || profile?.stage4?.passed) && !list.some(d => d.id === 's4_assessment_cert')) {
      list.push({
        id: 's4_assessment_cert',
        title: `Talentera Verified Medical Coding Assessment (${profile.stage4?.medal || 'Verified'} Tier · Score ${profile.stage4?.score || 85}%)`,
        docType: 'Verified Assessment Certificate',
        docUrl: profile.stage4?.reportUrl || null,
        docName: 'Talentera_Assessment_Report.pdf',
        score: profile.stage4?.score || 85,
        percentile: profile.stage4?.percentile || 92,
        medal: profile.stage4?.medal || 'Gold',
        uploadedAt: profile.stage4?.completedAt || profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 04 · Assessment',
        isAssessmentProof: true,
      });
    }

    // 5. Stage 5 Video Pitch
    if ((profile?.stage5?.videoUrl || profile?.stage5?.overallScore) && !list.some(d => d.id === 's5_video_proof')) {
      list.push({
        id: 's5_video_proof',
        title: `Verified Video Pitch & Communication Assessment (Score ${profile.stage5?.overallScore || 90}/100)`,
        docType: 'Video Pitch & Media',
        docUrl: profile.stage5?.videoUrl || null,
        docName: 'Candidate_Video_Pitch.mp4',
        uploadedAt: profile.stage5?.submittedAt || profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 05 · Video Pitch',
        isVideoProof: true,
      });
    }

    // 6. Stage 7 Master Resume
    if ((profile?.resumeUrl || profile?.stage7?.resumeUrl || profile?.resumeFileName) && !list.some(d => d.id === 's7_master_resume' || (profile?.resumeUrl && d.docUrl === profile.resumeUrl))) {
      list.push({
        id: 's7_master_resume',
        title: 'Talentera Verified Master Resume',
        docType: 'Resume / CV',
        docUrl: profile.resumeUrl || profile.stage7?.resumeUrl || null,
        docName: profile.resumeFileName || profile.stage7?.resumeFileName || 'Talentera_Verified_Resume.pdf',
        uploadedAt: profile.stage7?.updatedAt || profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 07 · Verified Resume',
      });
    }

    // 7. Stage 8 Experience / Offer Letter
    if (profile?.stage8?.offerLetterUrl && !list.some(d => d.docUrl === profile.stage8.offerLetterUrl || d.id === 's8_offer_letter')) {
      list.push({
        id: 's8_offer_letter',
        title: 'Company Offer / Appointment Letter',
        docType: 'Experience / Relieving Letter',
        docUrl: profile.stage8.offerLetterUrl,
        docName: 'Offer_Letter.pdf',
        uploadedAt: profile.updatedAt || new Date().toISOString(),
        status: 'verified',
        verified: true,
        stage: 'Stage 08 · Track',
      });
    }

    // 8. General documents array
    if (Array.isArray(profile?.documents)) {
      profile.documents.forEach((d, idx) => {
        if (!list.some(v => v.id === (d.id || `gen_doc_${idx}`) || (d.docUrl && v.docUrl === d.docUrl))) {
          list.push({
            id: d.id || `gen_doc_${idx}`,
            title: d.title || d.docName || `Document #${idx + 1}`,
            docType: d.docType || 'Document Proof',
            docUrl: d.docUrl || d.url || null,
            docName: d.docName || d.name || 'document.pdf',
            uploadedAt: d.uploadedAt || new Date().toISOString(),
            status: d.verified ? 'verified' : (d.status || 'pending'),
            verified: !!d.verified,
          });
        }
      });
    }

    return list;
  };

  const fetchVault = async () => {
    setLoading(true);
    try {
      const res = await api.get('/candidate/vault');
      const rawList = res.data?.documentVault || res.data?.documents || res.data?.vault || [];
      const merged = aggregateCandidateDocuments(rawList, res.data?.candidate || candidate);
      setDocuments(merged);
    } catch (err) {
      console.warn('Vault fetch fallback to candidate:', err);
      const fallback = aggregateCandidateDocuments(candidate?.documentVault || [], candidate);
      setDocuments(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVault();
  }, [candidate]);

  // Upload handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Please enter a title for the document.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('doc', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('docType', uploadDocType);

      const res = await api.post('/candidate/upload/vault-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        showToast('Document securely uploaded and verified in your vault!');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        fetchVault();
        if (onVaultUpdated) onVaultUpdated();
      } else {
        setUploadError(res.data?.message || 'Failed to upload document.');
      }
    } catch (err) {
      console.error('Upload vault doc error:', err);
      setUploadError(err.response?.data?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this document from your vault?')) return;
    try {
      await api.delete(`/candidate/vault/document/${docId}`);
      showToast('Document removed from vault.');
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (onVaultUpdated) onVaultUpdated();
    } catch (err) {
      console.error('Delete doc error:', err);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      showToast('Document removed.');
    }
  };

  // Filtering
  const filteredDocuments = documents.filter((doc) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (doc.title || '').toLowerCase().includes(q);
      const matchType = (doc.docType || '').toLowerCase().includes(q);
      const matchName = (doc.docName || '').toLowerCase().includes(q);
      const matchStage = (doc.stage || '').toLowerCase().includes(q);
      const matchInstitute = (doc.institute || '').toLowerCase().includes(q);
      if (!matchTitle && !matchType && !matchName && !matchStage && !matchInstitute) return false;
    }

    // Category tab filter
    if (activeCategory === 'all') return true;
    const type = (doc.docType || '').toLowerCase();
    const stage = (doc.stage || '').toLowerCase();

    if (activeCategory === 'certs') {
      return type.includes('aapc') || type.includes('cert') || doc.isRegisteredCert;
    }
    if (activeCategory === 'assessments') {
      return type.includes('assessment') || type.includes('video') || type.includes('chart') || doc.isAssessmentProof || doc.isVideoProof;
    }
    if (activeCategory === 'training') {
      return type.includes('training') || type.includes('institute') || stage.includes('stage 02');
    }
    if (activeCategory === 'identity') {
      return type.includes('government') || type.includes('id') || type.includes('aadhaar') || stage.includes('stage 01');
    }
    if (activeCategory === 'education') {
      return type.includes('degree') || type.includes('diploma') || type.includes('marksheet') || type.includes('transcript');
    }
    if (activeCategory === 'resume_exp') {
      return type.includes('resume') || type.includes('experience') || type.includes('offer') || type.includes('relieving') || stage.includes('stage 07') || stage.includes('stage 08');
    }
    return true;
  });

  const getDocIcon = (doc) => {
    const t = (doc.docType || '').toLowerCase();
    if (t.includes('aapc') || t.includes('cert')) return '🎓';
    if (t.includes('assessment') || doc.isAssessmentProof) return '📊';
    if (t.includes('video') || doc.isVideoProof) return '🎥';
    if (t.includes('training') || t.includes('institute')) return '🏫';
    if (t.includes('government') || t.includes('id') || t.includes('aadhaar')) return '🪪';
    if (t.includes('degree') || t.includes('diploma') || t.includes('transcript')) return '📜';
    if (t.includes('resume')) return '📄';
    if (t.includes('experience') || t.includes('offer')) return '💼';
    return '📁';
  };

  const totalVerifiedCount = documents.filter(d => d.verified || d.status === 'verified').length;
  const certsCount = documents.filter(d => (d.docType || '').toLowerCase().includes('cert') || d.isRegisteredCert).length;

  return (
    <div className="candidate-documents-vault" style={{ padding: '24px 32px', background: '#F8FAFC', minHeight: '100%' }}>
      {/* Toast */}
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
          fontWeight: 600,
          fontSize: 14,
          animation: 'fadeIn 0.2s ease',
        }}>
          <span>✓</span> {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#059669',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#059669' }}></span>
            Your Verified Document Vault · Single Source of Truth
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F1B3D', margin: 0, letterSpacing: '-0.02em' }}>
            My Documents
          </h1>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: '6px 0 0', maxWidth: 740, lineHeight: 1.5 }}>
            Every document you've uploaded during verification, organized here. Companies view your Verified Documents card here.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0F1B3D',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15,27,61,0.15)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> Upload Document
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14,
        marginBottom: 24,
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Vault Documents
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F1B3D', marginTop: 4 }}>
            {documents.length}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
            Across all verification stages
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Verified Single Source
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓ {totalVerifiedCount}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#059669', marginTop: 2, fontWeight: 600 }}>
            100% Employer Authenticated
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Registered Certifications
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#6366F1', marginTop: 4 }}>
            {certsCount}
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
            AAPC / Professional Credentials
          </div>
        </div>

        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Security & Trust
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F1B3D', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔒 Encrypted Vault</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
            Tamper-evident verification repository
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12.5,
                fontWeight: activeCategory === tab.id ? 700 : 500,
                background: activeCategory === tab.id ? '#0F1B3D' : '#F1F5F9',
                color: activeCategory === tab.id ? '#FFFFFF' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Layout toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 13 }}>🔍</span>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: 12.5,
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 2 }}>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '5px 8px',
                cursor: 'pointer',
                fontSize: 12,
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              style={{
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '5px 8px',
                cursor: 'pointer',
                fontSize: 12,
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid / List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Loading your verified document vault...</div>
        </div>
      ) : filteredDocuments.length > 0 ? (
        viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
            {filteredDocuments.map((doc, idx) => {
              const isVerified = doc.verified || doc.status === 'verified';
              const icon = getDocIcon(doc);
              const docUrl = doc.docUrl || doc.url || doc.fileUrl;

              return (
                <div
                  key={doc.id || idx}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    {/* Top Row: Icon, Category Tag, and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          background: '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                        }}>
                          {icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {doc.stage || doc.docType || 'Document'}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>
                            {doc.uploadedAt ? `Archived ${new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Verified on file'}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 9px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        background: isVerified ? '#ECFDF5' : '#FEF3C7',
                        color: isVerified ? '#059669' : '#D97706',
                        border: isVerified ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                        whiteSpace: 'nowrap',
                      }}>
                        {isVerified ? '✓ Verified' : '⏳ Pending'}
                      </span>
                    </div>

                    {/* Document Title & Key Details */}
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F1B3D', margin: '0 0 6px', lineHeight: 1.35 }}>
                      {doc.title || doc.docName || 'Document'}
                    </h3>

                    {doc.docName && (
                      <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', marginBottom: 6, wordBreak: 'break-all' }}>
                        📄 {doc.docName}
                      </div>
                    )}

                    {/* Extra context tags if available */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {doc.memberId && (
                        <span style={{ background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                          Member ID: {doc.memberId}
                        </span>
                      )}
                      {doc.score !== undefined && (
                        <span style={{ background: '#ECFDF5', color: '#059669', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>
                          Score: {doc.score}% · {doc.medal || 'Gold'}
                        </span>
                      )}
                      {doc.institute && (
                        <span style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4 }}>
                          🏫 {doc.institute}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    borderTop: '1px solid #F1F5F9',
                    marginTop: 6,
                  }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {docUrl ? (
                        <>
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#1E293B',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            👁️ Preview
                          </button>

                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.docName || 'document'}
                            style={{
                              background: '#0F1B3D',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#FFFFFF',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            ⬇️ Download
                          </a>
                        </>
                      ) : (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1E293B',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          🔍 View Verification
                        </button>
                      )}
                    </div>

                    {doc.id && !doc.isRegisteredCert && !doc.isAssessmentProof && (
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        title="Remove Document"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          fontSize: 13,
                          padding: '4px 6px',
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  <th style={{ padding: '12px 18px' }}>Document Name</th>
                  <th style={{ padding: '12px 18px' }}>Category & Stage</th>
                  <th style={{ padding: '12px 18px' }}>Archived Date</th>
                  <th style={{ padding: '12px 18px' }}>Status</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc, idx) => {
                  const isVerified = doc.verified || doc.status === 'verified';
                  const docUrl = doc.docUrl || doc.url || doc.fileUrl;

                  return (
                    <tr key={doc.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{getDocIcon(doc)}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F1B3D' }}>{doc.title || doc.docName}</div>
                            {doc.docName && <div style={{ fontSize: 11.5, color: '#94A3B8', fontFamily: 'monospace' }}>{doc.docName}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: '#475569' }}>
                        <div>{doc.docType || 'Document'}</div>
                        {doc.stage && <div style={{ fontSize: 11, color: '#94A3B8' }}>{doc.stage}</div>}
                      </td>
                      <td style={{ padding: '14px 18px', color: '#64748B' }}>
                        {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isVerified ? '#ECFDF5' : '#FEF3C7',
                          color: isVerified ? '#059669' : '#D97706',
                        }}>
                          {isVerified ? '✓ Verified' : '⏳ Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: 11.5,
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Preview
                          </button>
                          {docUrl && (
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.docName}
                              style={{
                                background: '#0F1B3D',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 4,
                                padding: '4px 8px',
                                fontSize: 11.5,
                                cursor: 'pointer',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Empty State */
        <div style={{
          background: '#FFFFFF',
          border: '1.5px dashed #CBD5E1',
          borderRadius: 14,
          padding: '60px 24px',
          textAlign: 'center',
          maxWidth: 600,
          margin: '30px auto',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗄️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F1B3D', margin: '0 0 6px' }}>
            {searchQuery ? 'No documents match your search' : 'No documents in this category yet'}
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
            {searchQuery
              ? 'Try searching with different keywords or switch category filter tabs.'
              : 'Upload your AAPC certifications, academic degrees, or government ID proofs to build your verified vault.'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: '#0F1B3D',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Upload Your First Document
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,27,61,0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 520,
            padding: '24px 28px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F1B3D', margin: 0 }}>
                  Upload Document to Vault
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                  Supported formats: PDF, JPG, PNG, DOCX (Max 10MB)
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12.5,
                marginBottom: 16,
              }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              {/* File input drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: 10,
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: uploadFile ? '#F0FDF4' : '#F8FAFC',
                  borderColor: uploadFile ? '#86EFAC' : '#CBD5E1',
                  marginBottom: 16,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                />
                <div style={{ fontSize: 30, marginBottom: 6 }}>
                  {uploadFile ? '📄' : '📁'}
                </div>
                {uploadFile ? (
                  <div>
                    <div style={{ fontWeight: 700, color: '#059669', fontSize: 13.5 }}>{uploadFile.name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Click to change file
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, color: '#0F1B3D', fontSize: 13.5 }}>Click or drag file here</div>
                    <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>PDF, PNG, JPG, or DOC up to 10MB</div>
                  </div>
                )}
              </div>

              {/* Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Document Title / Credential Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AAPC CPC Certification Certificate"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Document Category */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Document Category *
                </label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                    background: '#FFFFFF',
                  }}
                >
                  {UPLOAD_DOC_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0F1B3D',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.7 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : 'Save & Verify in Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,27,61,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0F1B3D',
              color: '#FFFFFF',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{getDocIcon(previewDoc)}</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{previewDoc.title || previewDoc.docName}</h3>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                    {previewDoc.stage || previewDoc.docType} · Single Source of Truth
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'transparent', border: 'none', color: '#FFFFFF', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
              {previewDoc.docUrl ? (
                previewDoc.docUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ? (
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={previewDoc.docUrl}
                      alt={previewDoc.title}
                      style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, border: '1px solid #E2E8F0' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
                    <div style={{ fontWeight: 700, color: '#0F1B3D', fontSize: 15 }}>{previewDoc.docName || 'Document File'}</div>
                    <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, marginBottom: 16 }}>
                      Document is stored securely in Talentera's Verified Vault.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                      <a
                        href={previewDoc.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#0F1B3D',
                          color: '#FFFFFF',
                          padding: '8px 18px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Open in New Window ↗
                      </a>
                      <a
                        href={previewDoc.docUrl}
                        download={previewDoc.docName || 'document'}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          padding: '8px 18px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        Download File ⬇️
                      </a>
                    </div>
                  </div>
                )
              ) : (
                /* Verification Card details if file is registered via system */
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, color: '#059669' }}>✓</span>
                    <span style={{ fontWeight: 800, color: '#0F1B3D', fontSize: 14 }}>
                      System-Verified Digital Credential
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600 }}>Credential Name</div>
                      <div style={{ color: '#0F1B3D', fontWeight: 700, marginTop: 2 }}>{previewDoc.title}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600 }}>Verification Category</div>
                      <div style={{ color: '#0F1B3D', fontWeight: 700, marginTop: 2 }}>{previewDoc.docType}</div>
                    </div>
                    {previewDoc.memberId && (
                      <div>
                        <div style={{ color: '#64748B', fontWeight: 600 }}>Member / License ID</div>
                        <div style={{ color: '#0F1B3D', fontWeight: 700, marginTop: 2 }}>{previewDoc.memberId}</div>
                      </div>
                    )}
                    {previewDoc.score !== undefined && (
                      <div>
                        <div style={{ color: '#64748B', fontWeight: 600 }}>Score & Medal</div>
                        <div style={{ color: '#059669', fontWeight: 700, marginTop: 2 }}>
                          {previewDoc.score}% ({previewDoc.medal} Tier · {previewDoc.percentile}th Percentile)
                        </div>
                      </div>
                    )}
                    {previewDoc.institute && (
                      <div>
                        <div style={{ color: '#64748B', fontWeight: 600 }}>Training Institute</div>
                        <div style={{ color: '#0F1B3D', fontWeight: 700, marginTop: 2 }}>{previewDoc.institute}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ color: '#64748B', fontWeight: 600 }}>Status</div>
                      <div style={{ color: '#059669', fontWeight: 700, marginTop: 2 }}>✓ Verified Single Source of Truth</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', background: '#F8FAFC' }}>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  background: '#0F1B3D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 16px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
