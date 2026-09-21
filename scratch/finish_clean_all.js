const fs = require('fs');
const path = require('path');

function cleanStaffHub() {
  const file = path.resolve('frontend/src/pages/StaffHub.jsx');
  let s = fs.readFileSync(file, 'utf8');
  const isCrlf = s.includes('\r\n');
  if (isCrlf) s = s.replace(/\r\n/g, '\n');

  // Replace remaining specific patterns
  const patterns = [
    [
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        👥\n                      </div>',
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>\n                        <i className="fa-solid fa-users"></i>\n                      </div>'
    ],
    [
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        🏢\n                      </div>',
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>\n                        <i className="fa-solid fa-building"></i>\n                      </div>'
    ],
    [
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        🎓\n                      </div>',
      '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>\n                        <i className="fa-solid fa-graduation-cap"></i>\n                      </div>'
    ],
    [
      'title="Jobs and applications">\n                              🎯\n                            </button>',
      'title="Jobs and applications">\n                              <i className="fa-solid fa-bullseye"></i>\n                            </button>'
    ],
    [
      'title="Gold Verified">\n                                ✓\n                              </button>',
      'title="Gold Verified">\n                                <i className="fa-solid fa-check"></i>\n                              </button>'
    ],
    [
      'title="Verify candidate">\n                                ✓ Verify\n                              </button>',
      'title="Verify candidate">\n                                <><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Verify</>\n                              </button>'
    ],
    [
      'title={`Reset login password for ${c.fullName || c.email}`}>\n                              🔑\n                            </button>',
      'title={`Reset login password for ${c.fullName || c.email}`}>\n                              <i className="fa-solid fa-key"></i>\n                            </button>'
    ],
    [
      'title="Applicants">\n                              👥\n                            </button>',
      'title="Applicants">\n                              <i className="fa-solid fa-users"></i>\n                            </button>'
    ],
    [
      'title="Assign Subscription Plan">\n                              ⚙️ Plan\n                            </button>',
      'title="Assign Subscription Plan">\n                              <><i className="fa-solid fa-gear" style={{ marginRight: 4 }}></i> Plan</>\n                            </button>'
    ],
    [
      'title={`Reset login password for ${comp.companyName || comp.email}`}>\n                              🔑 Reset Pass\n                            </button>',
      'title={`Reset login password for ${comp.companyName || comp.email}`}>\n                              <><i className="fa-solid fa-key" style={{ marginRight: 4 }}></i> Reset Pass</>\n                            </button>'
    ],
    [
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          🎯\n                        </button>',
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          <i className="fa-solid fa-bullseye"></i>\n                        </button>'
    ],
    [
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          🔍\n                        </button>',
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          <i className="fa-solid fa-magnifying-glass"></i>\n                        </button>'
    ],
    [
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          🎤\n                        </button>',
      'cursor: "pointer", fontWeight: 700, color: "#475569", fontSize: 16 }}>\n                          <i className="fa-solid fa-microphone"></i>\n                        </button>'
    ],
    [
      '<div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>\n                    🏢\n                  </div>',
      '<div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>\n                    <i className="fa-solid fa-building"></i>\n                  </div>'
    ],
    [
      '<div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>\n                    🎓\n                  </div>',
      '<div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>\n                    <i className="fa-solid fa-graduation-cap"></i>\n                  </div>'
    ]
  ];

  for (const [from, to] of patterns) {
    s = s.split(from).join(to);
  }

  if (isCrlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s, 'utf8');
  console.log('StaffHub: patterns updated.');
}

function cleanCompanyPortal() {
  const file = path.resolve('frontend/src/pages/CompanyPortal.jsx');
  let s = fs.readFileSync(file, 'utf8');
  const isCrlf = s.includes('\r\n');
  if (isCrlf) s = s.replace(/\r\n/g, '\n');

  const patterns = [
    [
      '<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>\n                🔒\n              </div>',
      '<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#D97706" }}>\n                <i className="fa-solid fa-lock"></i>\n              </div>'
    ],
    [
      '<div style={{ width: 40, height: 40, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                ✓\n              </div>',
      '<div style={{ width: 40, height: 40, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#16A34A" }}>\n                <i className="fa-solid fa-check"></i>\n              </div>'
    ],
    [
      '<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>\n                ⚡\n              </div>',
      '<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#2563EB" }}>\n                <i className="fa-solid fa-bolt"></i>\n              </div>'
    ],
    ['<div>{selectedCandidate.aadhaarVerified ? (<>✓ Basic Identity:', '<div>{selectedCandidate.aadhaarVerified ? (<><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Basic Identity:'],
    ['<div>✓ Academy Claim:', '<div><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Academy Claim:'],
    ['<div>✓ Proctored Test:', '<div><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Proctored Test:'],
    ['<div>✓ Live Chart Audit:', '<div><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Live Chart Audit:'],
    ['🔒 Locked (Free Tier)', '<><i className="fa-solid fa-lock" style={{ marginRight: 4 }}></i> Locked (Free Tier)</>'],
    ['✓ Video Recorded', '<><i className="fa-solid fa-check" style={{ color: "#16A34A", marginRight: 4 }}></i> Video Recorded</>'],
    ['AI Communication Score: {companyPlan === "free" ? "🔒 Locked (Growth Tier)" : `${selectedCandidate.stage5Score}%`}', 'AI Communication Score: {companyPlan === "free" ? <><i className="fa-solid fa-lock" style={{ marginRight: 4 }}></i> Locked (Growth Tier)</> : `${selectedCandidate.stage5Score}%`}'],
    ['{companyPlan === "free" ? "🔒 Shortlist (Growth Tier)" : shortlistedIds.includes(selectedCandidate.id) ? "Shortlisted ✓" : "+ Shortlist Profile"}', '{companyPlan === "free" ? <><i className="fa-solid fa-lock" style={{ marginRight: 4 }}></i> Shortlist (Growth Tier)</> : shortlistedIds.includes(selectedCandidate.id) ? <><i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Shortlisted</> : "+ Shortlist Profile"}']
  ];

  for (const [from, to] of patterns) {
    s = s.split(from).join(to);
  }

  if (isCrlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, s, 'utf8');
  console.log('CompanyPortal: patterns updated.');
}

cleanStaffHub();
cleanCompanyPortal();
