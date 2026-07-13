const { withTimeout, withTrailingSlash, CORS_HEADERS } = require("./_util");

const RELAY_BASE_URL = process.env.RELAY_BASE_URL;
const RELAY_API_KEY = process.env.RELAY_API_KEY || "";

// Classic (buffered) Netlify Function. Works on every Netlify plan, but the
// whole audio file has to fit in one response - Netlify's hard cap for a
// synchronous Function response is ~6MB base64-encoded (~4.5MB raw audio).
// That covers most short web-audio clips; if you serve longer/higher-bitrate
// tracks and start hitting size or timeout errors, ask for the streaming-
// Function version instead (uses Netlify's newer Response-streaming API,
// which can pass through Range requests properly for seeking too).
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed." }) };
  }

  const filename = (event.queryStringParameters?.filename || "").trim();
  if (!filename) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing required 'filename' parameter." }),
    };
  }
  if (!RELAY_BASE_URL) {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Audio unavailable: RELAY_BASE_URL is not configured on the server." }),
    };
  }

  const { signal, clear } = withTimeout(25000);
  try {
    const base = withTrailingSlash(RELAY_BASE_URL);
    const url = `${base}audio/${encodeURIComponent(filename)}`;
    const headers = RELAY_API_KEY ? { "X-Relay-Key": RELAY_API_KEY } : {};
    const res = await fetch(url, { headers, signal });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Audio fetch failed: relay returned HTTP ${res.status}` }),
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": res.headers.get("content-type") || "audio/webm",
        "Cache-Control": "public, max-age=86400",
      },
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("[audio] relay failed:", err.message);
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Audio fetch failed: relay backend unreachable or errored." }),
    };
  } finally {
    clear();
  }
};
