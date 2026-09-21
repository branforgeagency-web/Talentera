const fs = require('fs');
const path = require('path');

// 1. CLEAN STAFFHUB.JSX
function cleanStaffHub() {
  const file = path.resolve('frontend/src/pages/StaffHub.jsx');
  let s = fs.readFileSync(file, 'utf8');

  const map = [
    // toasts
    ['showToast("Retake approved! Notification email sent to candidate. ✉️");', 'showToast("Retake approved! Notification email sent to candidate.");'],
    ['showToast(isEdit ? "Interview question updated successfully! ✓" : "New interview question added to bank! ✓");', 'showToast(isEdit ? "Interview question updated successfully!" : "New interview question added to bank!");'],
    ['showToast(data.message || "Standard domain questions reset successfully! ✓");', 'showToast(data.message || "Standard domain questions reset successfully!");'],
    ['showToast(isEdit ? "Assessment question updated! ✓" : "New Stage 4 MCQ added to bank! ✓");', 'showToast(isEdit ? "Assessment question updated!" : "New Stage 4 MCQ added to bank!");'],
    ['created successfully! 🎉`);', 'created successfully!`);'],
    ['"Active ✓" : "Deactivated"', '"Active" : "Deactivated"'],
    ['! 🔑`);', '!`);'],
    ['showToast(`✓ Plan changed to ${newPlan.toUpperCase()} successfully!`);', 'showToast(`Plan changed to ${newPlan.toUpperCase()} successfully!`);'],
    ['showToast(`✓ Applicant status updated to ${newStatus.toUpperCase()}`);', 'showToast(`Applicant status updated to ${newStatus.toUpperCase()}`);'],
    ['showToast(`⚡ ${student.name} sent to verification pipeline!`);', 'showToast(`${student.name} sent to verification pipeline!`);'],
    ['Invalid ✖"', 'Invalid"'],
    ['<span>✨</span> {toastMsg}', '<span><i className="fa-solid fa-circle-check" style={{ color: "#22C55E", marginRight: 6 }}></i></span> {toastMsg}'],
    ['{isActive && <span style={{ color: theme.accent, fontWeight: 800 }}>✓</span>}', '{isActive && <span style={{ color: theme.accent, fontWeight: 800 }}><i className="fa-solid fa-check"></i></span>}'],
    ['✓ All academy partner uploads reviewed for today!', '<><i className="fa-solid fa-check" style={{ marginRight: 6, color: "#16A34A" }}></i> All academy partner uploads reviewed for today!</>'],

    // Directory action cards
    ['<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        👥\n                      </div>', '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        <i className="fa-solid fa-users"></i>\n                      </div>'],
    ['<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        🏢\n                      </div>', '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        <i className="fa-solid fa-building"></i>\n                      </div>'],
    ['<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        🎓\n                      </div>', '<div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(10,31,61,0.08)", color: "var(--navy, #0A1F3D)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>\n                        <i className="fa-solid fa-graduation-cap"></i>\n                      </div>'],

    // Grid buttons
    ['title="Jobs and applications">\n                              🎯\n                            </button>', 'title="Jobs and applications">\n                              <i className="fa-solid fa-bullseye"></i>\n                            </button>'],
    ['title="Gold Verified">\n                                ✓\n                              </button>', 'title="Gold Verified">\n                                <i className="fa-solid fa-check"></i>\n                              </button>'],
    ['title="Verify candidate">\n                                ✓ Verify\n                              </button>', 'title="Verify candidate">\n                                <i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Verify\n                              </button>'],
    ['title={`Reset login password for ${c.fullName || c.email}`}>\n                              🔑\n                            </button>', 'title={`Reset login password for ${c.fullName || c.email}`}>\n                              <i className="fa-solid fa-key"></i>\n                            </button>'],
    ['{companiesLoading ? "Refreshing..." : "🔄 Refresh Directory"}', '{companiesLoading ? "Refreshing..." : <><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh Directory</>}'],
    ['title="Applicants">\n                              👥\n                            </button>', 'title="Applicants">\n                              <i className="fa-solid fa-users"></i>\n                            </button>'],
    ['title="Assign Subscription Plan">\n                              ⚙️ Plan\n                            </button>', 'title="Assign Subscription Plan">\n                              <i className="fa-solid fa-gear" style={{ marginRight: 4 }}></i> Plan\n                            </button>'],
    ['title={`Reset login password for ${comp.companyName || comp.email}`}>\n                              🔑 Reset Pass\n                            </button>', 'title={`Reset login password for ${comp.companyName || comp.email}`}>\n                              <i className="fa-solid fa-key" style={{ marginRight: 4 }}></i> Reset Pass\n                            </button>'],

    // Empty search divs
    ['<div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>', '<div style={{ fontSize: 28, marginBottom: 8, color: "#94A3B8" }}><i className="fa-solid fa-magnifying-glass"></i></div>'],
    ['<div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>', '<div style={{ fontSize: 32, marginBottom: 12, color: "#64748B" }}><i className="fa-solid fa-bullseye"></i></div>'],
    ['<div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>', '<div style={{ fontSize: 32, marginBottom: 12, color: "#64748B" }}><i className="fa-solid fa-microphone"></i></div>'],

    // Academy grid cards
    ['title="All courses">\n                              📚 Courses\n                            </button>', 'title="All courses">\n                              <i className="fa-solid fa-book" style={{ marginRight: 4 }}></i> Courses\n                            </button>'],
    ['title="All batches">\n                              🎓 Batches\n                            </button>', 'title="All batches">\n                              <i className="fa-solid fa-graduation-cap" style={{ marginRight: 4 }}></i> Batches\n                            </button>'],
    ['title="All candidates">\n                              👥 Candidates\n                            </button>', 'title="All candidates">\n                              <i className="fa-solid fa-users" style={{ marginRight: 4 }}></i> Candidates\n                            </button>'],
    ['title="Placement tracker">\n                              💼 Placements\n                            </button>', 'title="Placement tracker">\n                              <i className="fa-solid fa-briefcase" style={{ marginRight: 4 }}></i> Placements\n                            </button>'],

    // Default icon strings in forms
    ['sectionIcon: "🎯"', 'sectionIcon: "fa-bullseye"'],
    ['sectionIcon: q.sectionIcon || "🎯"', 'sectionIcon: q.sectionIcon || "fa-bullseye"'],
    ['sectionIcon: assessmentForm.sectionIcon || "🎯"', 'sectionIcon: assessmentForm.sectionIcon || "fa-bullseye"'],
    ['placeholder="🫀"', 'placeholder="fa-heart-pulse"'],

    // Close buttons ✕
    ['style={{ background: "transparent", border: "none", fontSize: 20, color: "var(--text-muted, #4A5568)", cursor: "pointer" }}\n              >\n                ✕\n              </button>', 'style={{ background: "transparent", border: "none", fontSize: 18, color: "var(--text-muted, #4A5568)", cursor: "pointer" }}\n              >\n                <i className="fa-solid fa-xmark"></i>\n              </button>'],
    ['style={{\n                  background: "#E2E8F0",\n                  border: "none",\n                  borderRadius: "50%",\n                  width: 32,\n                  height: 32,\n                  display: "flex",\n                  alignItems: "center",\n                  justifyContent: "center",\n                  cursor: "pointer",\n                  fontWeight: 700,\n                  color: "#475569",\n                  fontSize: 16,\n                }}\n              >\n                ✕\n              </button>', 'style={{\n                  background: "#E2E8F0",\n                  border: "none",\n                  borderRadius: "50%",\n                  width: 32,\n                  height: 32,\n                  display: "flex",\n                  alignItems: "center",\n                  justifyContent: "center",\n                  cursor: "pointer",\n                  fontWeight: 700,\n                  color: "#475569",\n                  fontSize: 14,\n                }}\n              >\n                <i className="fa-solid fa-xmark"></i>\n              </button>'],
    ['style={{ background: "none", border: "none", fontSize: 20, color: "var(--navy)", cursor: "pointer", padding: "0 4px" }}>✕</button>', 'style={{ background: "none", border: "none", fontSize: 16, color: "var(--navy)", cursor: "pointer", padding: "0 4px" }}><i className="fa-solid fa-xmark"></i></button>']
  ];

  let applied = 0;
  for (const [from, to] of map) {
    if (s.includes(from)) {
      s = s.split(from).join(to);
      applied++;
    }
  }

  // Also replace any standalone ✕ in button with <i className="fa-solid fa-xmark"></i>
  s = s.replace(/>\s*✕\s*<\/button>/g, '><i className="fa-solid fa-xmark"></i></button>');
  s = s.replace(/>\s*✕\s*<\/span>/g, '><i className="fa-solid fa-xmark"></i></span>');

  fs.writeFileSync(file, s, 'utf8');
  console.log(`StaffHub: applied ${applied} cleanups.`);
}

cleanStaffHub();
