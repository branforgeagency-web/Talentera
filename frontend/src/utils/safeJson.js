/**
 * Safely parses JSON from a Fetch Response object.
 * Prevents uncaught "Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 * errors when responses have empty bodies (e.g., status 204) or HTML error pages.
 *
 * @param {Response} res - The fetch Response object
 * @returns {Promise<any>} Parsed JSON object/array or empty object / error object fallback
 */
export async function safeJson(res) {
  if (!res) return {};
  try {
    const text = await res.text();
    if (!text || !text.trim()) {
      return {};
    }
    return JSON.parse(text);
  } catch (err) {
    console.warn("safeJson parse warning:", err);
    return { message: res.statusText || `Server response error (${res.status || 500})` };
  }
}

export default safeJson;
