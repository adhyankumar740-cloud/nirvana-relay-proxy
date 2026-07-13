// Small shared helpers used by both search.js and resolve.js.
// No dependencies - Netlify Functions run on Node 18+, which has global fetch.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

/** AbortController-based timeout so a stuck upstream call can't hang the whole function. */
function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/** Parses YouTube's ISO-8601 "PT3M45S" style duration into whole seconds. */
function parseIso8601DurationSeconds(iso) {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
}

/** Ensures a base URL ends with exactly one trailing slash before a path is appended. */
function withTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

module.exports = { json, withTimeout, parseIso8601DurationSeconds, withTrailingSlash, CORS_HEADERS };
