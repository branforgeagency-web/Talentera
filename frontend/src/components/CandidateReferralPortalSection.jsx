import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function CandidateReferralPortalSection({
  candidate,
  referralsData,
  onRefresh,
  triggerToast,
}) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', mobile: '', note: '' });
  const [inviting, setInviting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeemForm, setRedeemForm] = useState({ payoutMethod: 'upi', upiId: '', accountHolder: '', accountNumber: '', ifsc: '' });
  const [redeeming, setRedeeming] = useState(false);
  const [showBonusesModal, setShowBonusesModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Fetch real top referrers from MongoDB
  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const res = await api.get('/candidate/referrals/leaderboard');
        if (isMounted && res.data?.leaderboard) {
          setLeaderboard(res.data.leaderboard);
        }
      } catch (err) {
        console.error('Failed to load referral leaderboard', err);
      } finally {
        if (isMounted) setLoadingLeaderboard(false);
      }
    };
    fetchLeaderboard();
    return () => { isMounted = false; };
  }, []);

  const pointsWallet = referralsData?.pointsWallet ?? candidate?.pointsWallet ?? 50;
  const referralCode = referralsData?.referralCode || (candidate?._id ? `TAL-${candidate._id.slice(-6).toUpperCase()}` : 'TAL-PASS');
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referralCode}` : `https://talentera.io/register?ref=${referralCode}`;
  const portalReferrals = referralsData?.portalReferrals || [];
  const redemptions = referralsData?.redemptions || [];

  const candidateName = candidate?.stage1?.fullname || candidate?.stage1?.fullName || candidate?.fullname || 'Candidate';
  const cashValue = Math.round(pointsWallet / 2);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(referralLink);
      triggerToast('Referral link copied to clipboard!');
    } else {
      triggerToast('Referral link: ' + referralLink);
    }
  };

  const handleSocialShare = (platform) => {
    const text = `Join Talentera - India's 1st Verified Medical Coding & Healthcare Career Platform. Use my referral link: ${referralLink}`;
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'linkedin') {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank');
    } else if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent('Join Talentera with my invite link')}&body=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleSendInvite = async (e) => {
    if (e) e.preventDefault();
    if (!inviteForm.name || (!inviteForm.email && !inviteForm.mobile)) {
      triggerToast('Please provide friend name and at least email or mobile.');
      return;
    }
    setInviting(true);
    try {
      const res = await api.post('/candidate/referrals/invite-portal', inviteForm);
      triggerToast(res.data?.message || 'Invitation sent! +100 points added to your wallet.');
      setInviteForm({ name: '', email: '', mobile: '', note: '' });
      setShowInviteModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Could not send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const rewardsCatalog = [
    { id: 'amazon-500', title: '₹500 Amazon Voucher', pts: 1000, inr: 500, icon: '🛒', desc: 'Voucher · Instant email delivery', color: 'var(--green)' },
    { id: 'cash-1000', title: '₹1,000 Cash Transfer', pts: 2000, inr: 1000, icon: '💰', desc: 'Direct UPI transfer · 24-48 hrs', color: 'var(--green)' },
    { id: 'aapc-ceus', title: '6 AAPC CEUs', pts: 5000, inr: 2500, icon: '📚', desc: 'Official CEU credits · $60 value', color: 'var(--gold-deep)' },
    { id: 'cpc-exam', title: 'FREE CPC Exam Voucher', pts: 10000, inr: 5000, icon: '🏆', desc: 'Worth $399 · Rare Exam Voucher', color: 'var(--purple)' },
    { id: 'aapc-member', title: '1-Yr AAPC Membership', pts: 20000, inr: 10000, icon: '🎓', desc: '$205 Renewal / New Member pass', color: 'var(--purple)' },
    { id: 'ambassador', title: '₹25,000 + Ambassador Club', pts: 50000, inr: 25000, icon: '💎', desc: 'Elite Tier · Verified Badge & Cash', color: 'var(--purple)' },
    { id: 'macbook', title: 'Apple MacBook Air M3', pts: 100000, inr: 50000, icon: '💻', desc: 'Top Tier Annual Super Reward', color: 'var(--gold-deep)' },
    { id: 'donate', title: 'Donate to Student in Need', pts: 500, inr: 250, icon: '❤️', desc: 'Sponsor another candidate CPC prep', color: 'var(--gold-deep)' },
  ];

  const handleSelectReward = (reward) => {
    if (pointsWallet < reward.pts && reward.id !== 'donate') {
      const need = reward.pts - pointsWallet;
      triggerToast(`You have ${pointsWallet} pts. Need ${need} more points for this reward.`);
      return;
    }
    setSelectedReward(reward);
    setShowRedeemModal(true);
  };

  const handleProcessRedeem = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    try {
      const payload = {
        rewardId: selectedReward.id,
        rewardTitle: selectedReward.title,
        pointsRequired: selectedReward.pts,
        valueInr: selectedReward.inr,
        payoutMethod: redeemForm.payoutMethod,
        payoutDetails: redeemForm.payoutMethod === 'upi' ? redeemForm.upiId : `${redeemForm.accountHolder} - ${redeemForm.accountNumber} (${redeemForm.ifsc})`,
      };
      const res = await api.post('/candidate/referrals/redeem', payload);
      triggerToast(res.data?.message || 'Redemption request submitted successfully!');
      setShowRedeemModal(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      triggerToast(err?.response?.data?.message || 'Redemption request failed.');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="page active" id="page-refer">
      {/* PAGE HEADER */}
      <div className="page-head">
        <div className="page-eyebrow">🎁 Talentera Referral Program · Earn points · Redeem cash + vouchers</div>
        <h1 className="page-title">Refer &amp; Earn</h1>
        <p className="page-sub">
          Refer your friends to Talentera. Earn points as they progress. Redeem for cash, gift vouchers, free CPC exams, or Ambassador rewards. Your network becomes your income stream.
        </p>
      </div>

      {/* POINTS WALLET HERO BANNER */}
      <div style={{ background: 'linear-gradient(135deg, var(--navy), #1E3A8A)', color: 'var(--white)', borderRadius: '18px', padding: '28px 32px', marginBottom: '20px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 24px rgba(15,27,61,.2)' }}>
        <div style={{ position: 'absolute', right: '-60px', top: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(245,180,26,.25), transparent 60%)' }}></div>
        <div style={{ position: 'absolute', left: '-40px', bottom: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(74,222,128,.15), transparent 60%)' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center', position: 'relative' }}>
          <div>
            <div style={{ color: 'var(--gold)', fontSize: '11px', fontWeight: '800', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
              🎁 Your Talentera Points Wallet
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-1px' }}>{pointsWallet.toLocaleString()}</div>
              <div style={{ fontSize: '14px', color: 'var(--gold-pale)', fontWeight: '600' }}>points</div>
              <div style={{ fontSize: '16px', color: 'var(--gold)', fontWeight: '800' }}>≈ ₹{cashValue.toLocaleString()} cash value</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ background: 'rgba(74,222,128,.28)', color: '#7ED87E', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                {portalReferrals.length > 0 ? `↑ ${portalReferrals.length * 100} pts earned` : '50 pts welcome balance'}
              </span>
              <span style={{ background: 'rgba(245,180,26,.22)', color: 'var(--gold)', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                Lifetime earned: {pointsWallet + redemptions.reduce((acc, r) => acc + (r.pointsSpent || 0), 0)} pts
              </span>
              <span style={{ background: 'rgba(255,255,255,.14)', color: 'var(--white)', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                {portalReferrals.length} friend{portalReferrals.length === 1 ? '' : 's'} invited
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                const el = document.getElementById('redemption-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else triggerToast('Browse reward catalog below');
              }}
              style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '14px 24px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(245,180,26,.4)' }}
            >
              🎁 Redeem Points →
            </button>
            <button
              onClick={() => handleSelectReward(rewardsCatalog[1])}
              style={{ background: 'rgba(255,255,255,.14)', color: 'var(--white)', padding: '10px 20px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', border: '1px solid rgba(255,255,255,.2)', cursor: 'pointer' }}
            >
              💰 Withdraw Cash
            </button>
          </div>
        </div>
      </div>

      {/* SHARE YOUR LINK */}
      <div style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '2px solid var(--gold)', borderRadius: '18px', padding: '24px 28px', marginBottom: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🔗 Your Unique Referral Link</span>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '6px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
          >
            ➕ Invite Directly
          </button>
        </div>
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--gold)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', Menlo, monospace", fontSize: '13.5px', fontWeight: '800', color: 'var(--navy)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {referralLink}
          </span>
          <button
            onClick={handleCopyLink}
            style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '8px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            📋 Copy Link
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            style={{ background: 'var(--navy)', color: 'var(--gold)', padding: '8px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
          >
            📱 QR
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <button
            onClick={() => handleSocialShare('whatsapp')}
            style={{ background: '#25D366', color: 'var(--white)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            💬 WhatsApp Share
          </button>
          <button
            onClick={() => handleSocialShare('linkedin')}
            style={{ background: '#0A66C2', color: 'var(--white)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            💼 LinkedIn Post
          </button>
          <button
            onClick={() => handleSocialShare('email')}
            style={{ background: 'var(--red)', color: 'var(--white)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            ✉ Email Friends
          </button>
          <button
            onClick={() => handleSocialShare('telegram')}
            style={{ background: '#0088CC', color: 'var(--white)', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            📢 Telegram
          </button>
        </div>
      </div>

      {/* HOW POINTS WORK */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">⚡</div>How you earn points · per referred friend
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>📝</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', fontWeight: '800' }}>Signup</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '4px' }}>+100</div>
          </div>
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🛡</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', fontWeight: '800' }}>Stage 01</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '4px' }}>+100</div>
          </div>
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🧪</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', fontWeight: '800' }}>Silver Assess.</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '4px' }}>+200</div>
          </div>
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>💻</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', fontWeight: '800' }}>Silver Chart</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '4px' }}>+200</div>
          </div>
          <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🚀</div>
            <div style={{ fontSize: '11px', color: 'var(--gray-mute)', fontWeight: '800' }}>Goes Live</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--gold-deep)', marginTop: '4px' }}>+100</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '2px solid var(--gold)', borderRadius: '12px', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🎉</div>
            <div style={{ fontSize: '11px', color: 'var(--gold-deep)', fontWeight: '800' }}>First Job!</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginTop: '4px' }}>+500</div>
          </div>
        </div>
        <div style={{ background: 'var(--navy)', color: 'var(--white)', borderRadius: '12px', padding: '14px 20px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px' }}>
            <b style={{ color: 'var(--gold)' }}>Max per friend: 1,200 points ≈ ₹600.</b> Plus multipliers: 2× for full academy batch · +100 bonus per Silver+ friend.
          </div>
          <button
            onClick={() => setShowBonusesModal(true)}
            style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
          >
            See all bonuses
          </button>
        </div>
      </div>

      {/* MY REFERRED FRIENDS */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">👥</div>My Referred Friends <span className="count">{portalReferrals.length} INVITED</span>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
          >
            + Invite friend →
          </button>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {portalReferrals.length > 0 ? (
            portalReferrals.map((friend) => (
              <div key={friend.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto auto auto', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #FDBA74, #F97316)', color: 'var(--white)', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '14px' }}>
                  {(friend.name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '13.5px' }}>{friend.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>
                    {friend.email || friend.mobile || 'Direct Invite'} {friend.note ? `· ${friend.note}` : ''} · {friend.createdAt ? new Date(friend.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                  </div>
                </div>
                <span style={{ background: friend.status === 'PLACED' ? 'var(--green-soft)' : 'var(--gold-pale)', color: friend.status === 'PLACED' ? 'var(--green)' : 'var(--gold-deep)', padding: '4px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: '800' }}>
                  {friend.stage || friend.status || 'Active Member'}
                </span>
                <span style={{ color: 'var(--gold-deep)', fontWeight: '800', fontSize: '13px' }}>+{friend.pointsAwarded || 100} pts</span>
                <span style={{ color: 'var(--gold-deep)', fontWeight: '800', fontSize: '13px' }}>₹{Math.round((friend.pointsAwarded || 100) / 2)}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '15px' }}>No referred friends logged yet</div>
              <p style={{ color: 'var(--gray-mute)', fontSize: '12.5px', maxWidth: '420px', margin: '6px auto 16px' }}>
                Share your unique link or submit an invite directly. You receive +100 points as soon as your invite is logged.
              </p>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '10px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '12.5px', border: 'none', cursor: 'pointer' }}
              >
                ➕ Invite Your First Friend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* REDEMPTION CATALOG */}
      <div className="sec" id="redemption-catalog">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">🎁</div>Redeem Your Points · {rewardsCatalog.length} rewards available
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {rewardsCatalog.map((reward) => {
            const isAvailable = pointsWallet >= reward.pts || reward.id === 'donate';
            const ptsNeeded = Math.max(0, reward.pts - pointsWallet);
            return (
              <div
                key={reward.id}
                onClick={() => handleSelectReward(reward)}
                style={{
                  background: 'var(--white)',
                  border: `2px solid ${isAvailable ? reward.color : 'var(--border)'}`,
                  borderRadius: '14px',
                  padding: '18px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: '.15s',
                  opacity: isAvailable ? 1 : 0.85,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(15,27,61,.12)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{ fontSize: '38px', marginBottom: '8px' }}>{reward.icon}</div>
                <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '14px' }}>{reward.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-mute)', margin: '4px 0 10px' }}>{reward.desc}</div>
                <div
                  style={{
                    background: isAvailable ? (reward.id === 'donate' ? 'var(--gold)' : 'var(--green)') : 'var(--gray-mute)',
                    color: isAvailable && reward.id === 'donate' ? 'var(--navy)' : 'var(--white)',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    display: 'inline-block',
                  }}
                >
                  {reward.id === 'donate' ? 'Any amount' : isAvailable ? `${reward.pts.toLocaleString()} pts · Available ✓` : `${reward.pts.toLocaleString()} pts · Need ${ptsNeeded.toLocaleString()}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REDEMPTION HISTORY (IF ANY) */}
      {redemptions.length > 0 && (
        <div className="sec">
          <div className="sec-head">
            <div className="sec-title">
              <div className="mod-ico">📋</div>My Redemptions &amp; Payouts <span className="count">{redemptions.length} REQUESTED</span>
            </div>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {redemptions.map((r, idx) => (
              <div key={r.id || idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '14px', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '13.5px' }}>{r.rewardTitle || 'Reward Redemption'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray-mute)', marginTop: '2px' }}>
                    {r.payoutMethod?.toUpperCase()} · {r.payoutDetails} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : 'Recently'}
                  </div>
                </div>
                <span style={{ background: r.status === 'COMPLETED' ? 'var(--green-soft)' : 'var(--amber-soft)', color: r.status === 'COMPLETED' ? 'var(--green)' : 'var(--amber)', padding: '4px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: '800' }}>
                  {r.status || 'PROCESSING'}
                </span>
                <span style={{ color: 'var(--red)', fontWeight: '800', fontSize: '13px' }}>-{r.pointsSpent || 0} pts</span>
                <span style={{ color: 'var(--green)', fontWeight: '800', fontSize: '13px' }}>₹{r.valueInr || Math.round((r.pointsSpent || 0) / 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MONTHLY LEADERBOARD */}
      <div className="sec">
        <div className="sec-head">
          <div className="sec-title">
            <div className="mod-ico">🏅</div>Top Referrers This Month <span className="count">LIVE STANDINGS</span>
          </div>
          <span className="sec-more" onClick={() => triggerToast('Real-time ambassador rankings across India')}>
            {leaderboard.length} referrers on board
          </span>
        </div>
        <div className="card" style={{ padding: 0 }}>
          {loadingLeaderboard ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-mute)' }}>Loading ambassador leaderboard...</div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((item, idx) => {
              const medalIcons = ['🥇', '🥈', '🥉'];
              const isTop3 = idx < 3;
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr auto auto',
                    gap: '16px',
                    padding: '14px 22px',
                    borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                    background: item.isCurrent ? 'linear-gradient(90deg, var(--blue-soft), transparent)' : (idx === 0 ? 'linear-gradient(90deg, var(--gold-pale), transparent)' : 'transparent'),
                    borderLeft: item.isCurrent ? '4px solid var(--blue)' : 'none',
                  }}
                >
                  <div style={{ fontSize: isTop3 ? '22px' : '15px', fontWeight: '800', color: isTop3 ? 'var(--gold-deep)' : 'var(--gray-mute)', textAlign: 'center' }}>
                    {isTop3 ? medalIcons[idx] : item.rank || idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '14px' }}>
                      {item.isCurrent ? `👉 You · ${candidateName}` : item.name} · {item.city}
                    </div>
                    <div style={{ fontSize: '11.5px', color: item.isCurrent ? 'var(--blue)' : 'var(--gray-mute)', marginTop: '2px', fontWeight: item.isCurrent ? '700' : '400' }}>
                      {item.referralsCount} referral{item.referralsCount === 1 ? '' : 's'} logged {item.isCurrent ? '· Keep sharing!' : '· Talentera Member'}
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', color: 'var(--gold-deep)', fontSize: '15px' }}>
                    {(item.points || 0).toLocaleString()} pts
                  </div>
                  <div style={{ fontSize: '11px', color: item.isCurrent ? 'var(--blue)' : 'var(--gray-mute)', fontWeight: item.isCurrent ? '800' : '400' }}>
                    Rank {item.rank || idx + 1}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto auto', gap: '16px', padding: '16px 22px', alignItems: 'center', background: 'linear-gradient(90deg, var(--blue-soft), transparent)', borderLeft: '4px solid var(--blue)' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--blue)', textAlign: 'center' }}>1</div>
              <div>
                <div style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '14px' }}>👉 You · {candidateName} · India</div>
                <div style={{ fontSize: '11.5px', color: 'var(--blue)', marginTop: '2px', fontWeight: '700' }}>
                  {portalReferrals.length} friends invited · Be the #1 Ambassador this month!
                </div>
              </div>
              <div style={{ fontWeight: '800', color: 'var(--gold-deep)', fontSize: '15px' }}>{pointsWallet.toLocaleString()} pts</div>
              <div style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: '800' }}>Rank 1</div>
            </div>
          )}
        </div>
      </div>

      {/* ANTI-ABUSE + FAQ NOTE */}
      <div style={{ background: 'var(--blue-soft)', border: '1.5px solid var(--blue)', borderRadius: '12px', padding: '18px 22px', marginTop: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--navy)', lineHeight: 1.6 }}>
          🛡 <b>Fair play rules:</b> Points vest as your friends progress through verification. Same Aadhaar / mobile / bank blocks self-referrals. Cash withdrawals require PAN + KYC on file. Talentera reserves the right to review accounts on abuse. Points valid for 24 months from earning.
        </div>
      </div>

      {/* DIRECT INVITE MODAL */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>🎁 Invite a Friend to Talentera</div>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--gray-txt)', marginBottom: '16px' }}>
              Enter your peer or batch-mate's details. You will instantly get <b>+100 points</b> credited to your wallet!
            </p>
            <form onSubmit={handleSendInvite}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px', textTransform: 'uppercase' }}>Friend's Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Reddy"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px', textTransform: 'uppercase' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="priya@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px', textTransform: 'uppercase' }}>Mobile Number</label>
                <input
                  type="tel"
                  placeholder="9876543210 (10 digits)"
                  maxLength={10}
                  value={inviteForm.mobile}
                  onChange={(e) => setInviteForm({ ...inviteForm, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px', textTransform: 'uppercase' }}>Personal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. College batch-mate or CPC study buddy"
                  value={inviteForm.note}
                  onChange={(e) => setInviteForm({ ...inviteForm, note: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
              <button
                type="submit"
                disabled={inviting}
                style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
              >
                {inviting ? 'Sending Invite...' : '📤 Send Invitation (+100 pts)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '380px', borderRadius: '16px', padding: '28px', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowQrModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginBottom: '6px' }}>📱 Scan to Register</div>
            <p style={{ fontSize: '12px', color: 'var(--gray-mute)', marginBottom: '16px' }}>Show this QR code to friends to scan directly on their phone camera</p>
            <div style={{ background: '#F8FAFC', border: '2px dashed var(--gold)', borderRadius: '14px', padding: '24px', display: 'inline-block', margin: '0 auto 16px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(referralLink)}`}
                alt="Talentera Referral QR"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: 'var(--navy)', fontWeight: '800', marginBottom: '14px' }}>
              Code: {referralCode}
            </div>
            <button
              onClick={handleCopyLink}
              style={{ width: '100%', background: 'var(--navy)', color: 'var(--gold)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
            >
              📋 Copy Link Instead
            </button>
          </div>
        </div>
      )}

      {/* REDEEM REWARD MODAL */}
      {showRedeemModal && selectedReward && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '28px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>🎁 Redeem Reward</div>
              <button onClick={() => setShowRedeemModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            </div>
            <div style={{ background: 'linear-gradient(135deg, var(--gold-pale), #FFF9E0)', border: '1.5px solid var(--gold)', borderRadius: '12px', padding: '16px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '32px' }}>{selectedReward.icon}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--navy)' }}>{selectedReward.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--gold-deep)', fontWeight: '700' }}>Cost: {selectedReward.pts.toLocaleString()} points · Worth ₹{selectedReward.inr.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '6px', textTransform: 'uppercase' }}>Payout / Delivery Method</label>
              <select
                value={redeemForm.payoutMethod}
                onChange={(e) => setRedeemForm({ ...redeemForm, payoutMethod: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
              >
                <option value="upi">UPI ID (Google Pay / PhonePe / Paytm)</option>
                <option value="bank">Direct Bank Transfer (NEFT/IMPS)</option>
                <option value="email">Voucher to Email ({candidate?.email || 'Registered Email'})</option>
              </select>
            </div>
            {redeemForm.payoutMethod === 'upi' && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--navy)', marginBottom: '4px', textTransform: 'uppercase' }}>Enter UPI ID *</label>
                <input
                  type="text"
                  placeholder="e.g. yourname@okhdfcbank"
                  value={redeemForm.upiId}
                  onChange={(e) => setRedeemForm({ ...redeemForm, upiId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
            )}
            {redeemForm.payoutMethod === 'bank' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <input
                  type="text"
                  placeholder="Account Holder Name"
                  value={redeemForm.accountHolder}
                  onChange={(e) => setRedeemForm({ ...redeemForm, accountHolder: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={redeemForm.accountNumber}
                  onChange={(e) => setRedeemForm({ ...redeemForm, accountNumber: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={redeemForm.ifsc}
                  onChange={(e) => setRedeemForm({ ...redeemForm, ifsc: e.target.value })}
                  style={{ padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '13px', gridColumn: 'span 2' }}
                />
              </div>
            )}
            <button
              onClick={handleProcessRedeem}
              disabled={redeeming}
              style={{ width: '100%', background: 'var(--gold)', color: 'var(--navy)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: 'none', cursor: 'pointer' }}
            >
              {redeeming ? 'Processing Redemption...' : `Confirm & Deduct ${selectedReward.pts.toLocaleString()} Points`}
            </button>
          </div>
        </div>
      )}

      {/* BONUS TIERS MODAL */}
      {showBonusesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,61,.7)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--white)', width: '100%', maxWidth: '520px', borderRadius: '16px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setShowBonusesModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--gray-mute)' }}>✕</button>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', marginBottom: '10px' }}>⚡ Talentera Referral Milestones &amp; Bonuses</div>
            <div style={{ fontSize: '12.5px', color: 'var(--gray-txt)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--gold)' }}>
                <b>1. Sign Up Bonus:</b> +100 points when your friend creates a Talentera account with your link.
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--gold)' }}>
                <b>2. Stage 01 Complete:</b> +100 points when they verify their identity via Aadhaar &amp; basic details.
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--gold)' }}>
                <b>3. Silver Assessment:</b> +200 points when they achieve Silver rating in domain evaluation.
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--gold)' }}>
                <b>4. Live Charts:</b> +200 points when they log verified chart audits in Stage 06.
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--gold)' }}>
                <b>5. Live for Hiring:</b> +100 points when their Career Passport reaches 100% and goes live.
              </div>
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--green)' }}>
                <b>6. First Job Offer Placed:</b> +500 points when they accept an offer with a healthcare company!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
