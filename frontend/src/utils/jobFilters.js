/**
 * Builds the query-params object for GET /public/jobs from the Jobs.jsx
 * search bar's raw form state, trimming whitespace and omitting empty
 * fields so an empty search box doesn't send `?q=` to the API. Pulled out
 * of Jobs.jsx so it's a plain function that's easy to unit test - see
 * frontend/tests/jobFilters.test.js.
 */
export function buildJobSearchParams({ q, location, workMode } = {}) {
  const params = {};
  if (q && String(q).trim()) params.q = String(q).trim();
  if (location && String(location).trim()) params.location = String(location).trim();
  if (workMode && String(workMode).trim()) params.workMode = String(workMode).trim();
  return params;
}
