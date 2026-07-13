const { json, withTimeout, withTrailingSlash } = require("./_util");

const RELAY_BASE_URL = process.env.RELAY_BASE_URL;
const RELAY_API_KEY = process.env.RELAY_API_KEY || "";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, {});
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." });

  const videoId = (event.queryStringParameters?.video_id || "").trim();
  if (!videoId) {
    return json(400, { error: "Missing required 'video_id' parameter." });
  }

  if (!RELAY_BASE_URL) {
    return json(502, { error: "Resolve unavailable: RELAY_BASE_URL is not configured on the server." });
  }

  // The relay's download_song() converts/fetches from YouTube on the FIRST
  // resolve for a given video id, so this can be slow. 25s leaves headroom
  // under Netlify's default 26s function timeout - if your plan/config
  // allows longer functions, raise both together.
  const { signal, clear } = withTimeout(25000);
  try {
    const base = withTrailingSlash(RELAY_BASE_URL);
    const url = `${base}resolve?video_id=${encodeURIComponent(videoId)}`;
    const headers = RELAY_API_KEY ? { "X-Relay-Key": RELAY_API_KEY } : {};
    const res = await fetch(url, { headers, signal });
    if (!res.ok) throw new Error(`Relay resolve returned HTTP ${res.status}`);
    const data = await res.json();
    if (!data.stream_url) throw new Error("Relay resolve response missing stream_url");

    // The relay's stream_url points at ITS OWN /audio/{filename}, which also
    // requires X-Relay-Key - a raw fetch of it from the app would 401 since
    // the app has no key. Rewrite it to our own keyless /api/audio proxy
    // (see audio.js), which attaches the key server-side instead.
    const filename = data.stream_url.split("/").pop();
    const proxiedStreamUrl = `https://${event.headers.host}/api/audio?filename=${encodeURIComponent(filename)}`;

    return json(200, { video_id: data.video_id ?? videoId, stream_url: proxiedStreamUrl });
  } catch (err) {
    console.error("[resolve] relay failed:", err.message);
    return json(502, { error: "Resolve failed: relay backend unreachable or errored." });
  } finally {
    clear();
  }
};
