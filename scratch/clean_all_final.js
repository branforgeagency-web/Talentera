const fs = require('fs');
const path = require('path');

// 1. StaffHub.jsx
const staffHubFile = path.resolve('frontend/src/pages/StaffHub.jsx');
let sh = fs.readFileSync(staffHubFile, 'utf8');

const shMap = [
  ['fontSize: 22,\n                            flexShrink: 0,\n                            boxShadow: "0 4px 10px rgba(37,99,235,0.25)",\n                          }}\n                        >\n                          🎯\n                        </div>', 'fontSize: 18,\n                            flexShrink: 0,\n                            boxShadow: "0 4px 10px rgba(37,99,235,0.25)",\n                          }}\n                        >\n                          <i className="fa-solid fa-bullseye"></i>\n                        </div>'],
  ['<span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }}>\n                          🔍\n                        </span>', '<span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 13 }}>\n                          <i className="fa-solid fa-magnifying-glass"></i>\n                        </span>'],
  ['fontSize: 20,\n                            flexShrink: 0,\n                            boxShadow: "0 4px 10px rgba(5,150,105,0.25)",\n                          }}\n                        >\n                          🎤\n                        </div>', 'fontSize: 18,\n                            flexShrink: 0,\n                            boxShadow: "0 4px 10px rgba(5,150,105,0.25)",\n                          }}\n                        >\n                          <i className="fa-solid fa-microphone"></i>\n                        </div>'],
  ['<div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>\n                    🏢\n                  </div>', '<div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>\n                    <i className="fa-solid fa-building"></i>\n                  </div>'],
  ['<div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>\n                    🎓\n                  </div>', '<div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.1)", color: "var(--gold, #E5A82E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>\n                    <i className="fa-solid fa-graduation-cap"></i>\n                  </div>']
];

for (const [from, to] of shMap) {
  sh = sh.replace(from, to);
}
fs.writeFileSync(staffHubFile, sh, 'utf8');
console.log('StaffHub clean complete.');

// 2. CompanyPortal.jsx
const compFile = path.resolve('frontend/src/pages/CompanyPortal.jsx');
let cp = fs.readFileSync(compFile, 'utf8');

const cpMap = [
  ['<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                  📞\n                </div>', '<div style={{ width: 44, height: 44, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>\n                  <i className="fa-solid fa-phone"></i>\n                </div>'],
  ['✓ Verified Company Direct Access', '<><i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i> Verified Company Direct Access</>'],
  ['<div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>\n                🔒\n              </div>', '<div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>\n                <i className="fa-solid fa-lock"></i>\n              </div>'],
  ['<div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>\n                ⚡\n              </div>', '<div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>\n                <i className="fa-solid fa-bolt"></i>\n              </div>']
];

for (const [from, to] of cpMap) {
  cp = cp.replace(from, to);
}
fs.writeFileSync(compFile, cp, 'utf8');
console.log('CompanyPortal clean complete.');

// 3. CandidateDashboard.jsx
const candFile = path.resolve('frontend/src/pages/CandidateDashboard.jsx');
let cd = fs.readFileSync(candFile, 'utf8');

const cdReplacements = [
  ['⚡', ''], // In scores or badges, replace or iconify
  ['📍', ''],
  ['🏢', ''],
  ['🟢', ''],
  ['📅', ''],
  ['📜', ''],
  ['💻', ''],
  ['📄', ''],
  ['📋', ''],
  ['⚪', ''],
  ['🎓', ''],
  ['🎥', ''],
  ['👤', ''],
  ['📚', ''],
  ['🏆', ''],
  ['🎯', ''],
  ['✉', ''],
  ['💰', ''],
  ['🧠', ''],
  ['🚪', ''],
  ['📊', ''],
  ['💬', ''],
  ['🎁', ''],
  ['🛡', ''],
  ['🔒', ''],
  ['➕', ''],
  ['🟡', ''],
  ['💼', ''],
  ['🔔', ''],
  ['🏅', ''],
  ['📁', ''],
  ['💌', ''],
  ['🔍', ''],
  ['📈', ''],
  ['🏫', ''],
  ['⚙', ''],
  ['❓', ''],
  ['👋', ''],
  ['🎖', ''],
  ['📷', ''],
  ['🎂', ''],
  ['🔄', ''],
  ['🔴', ''],
  ['👑', ''],
  ['✨', ''],
  ['💯', ''],
  ['🏔', ''],
  ['🌏', ''],
  ['🥇', ''],
  ['🚀', ''],
  ['🔵', ''],
  ['🛟', ''],
  ['🔗', ''],
  ['📢', '']
];
