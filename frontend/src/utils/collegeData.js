// College list from /public/colleges/colleges.json (built from the state sheets in "college list/").
// Loaded lazily on first use and cached; rows = [name, district, stateIdx, typeIdx, uniIdx].
let cache = null;
let pending = null;

export function loadColleges() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch("/colleges/colleges.json")
      .then((r) => { if (!r.ok) throw new Error("college list unavailable"); return r.json(); })
      .then((d) => {
        const rows = d.rows.map((r) => ({ name: r[0], district: r[1], state: d.states[r[2]], type: d.types[r[3]], university: d.unis[r[4]] || "" }));
        const lc = rows.map((r) => r.name.toLowerCase());
        const dists = new Map();
        rows.forEach((r) => {
          if (!r.district) return;
          const k = `${r.state}|${r.district}`;
          if (!dists.has(k)) dists.set(k, { district: r.district, state: r.state });
        });
        cache = {
          rows, lc, states: d.states,
          districts: [...dists.values()].sort((a, b) => a.district.localeCompare(b.district)),
        };
        return cache;
      })
      .catch((e) => { pending = null; throw e; });
  }
  return pending;
}

function rank(text, q, tokens) {
  if (text.startsWith(q)) return 0;
  if (text.includes(" " + q)) return 1;
  return tokens.every((t) => text.includes(t)) ? 2 : -1;
}

export function searchColleges(data, query, { state = "", limit = 40 } = {}) {
  if (!data) return [];
  const q = String(query || "").trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < data.rows.length; i++) {
    const r = data.rows[i];
    if (state && r.state !== state) continue;
    if (!q) { out.push([3, i]); if (out.length >= limit) break; continue; }
    const rk = rank(data.lc[i], q, tokens);
    if (rk >= 0) out.push([rk, i]);
  }
  out.sort((a, b) => a[0] - b[0] || data.rows[a[1]].name.length - data.rows[b[1]].name.length);
  return out.slice(0, limit).map(([, i]) => data.rows[i]);
}

export function searchLocations(data, query, { state = "", limit = 40 } = {}) {
  if (!data) return [];
  const q = String(query || "").trim().toLowerCase();
  const list = data.districts.filter((d) => (!state || d.state === state) && (!q || d.district.toLowerCase().includes(q) || (!state && d.state.toLowerCase().includes(q))));
  list.sort((a, b) => {
    const as = a.district.toLowerCase().startsWith(q) ? 0 : 1;
    const bs = b.district.toLowerCase().startsWith(q) ? 0 : 1;
    return as - bs || a.district.localeCompare(b.district);
  });
  return list.slice(0, limit);
}
