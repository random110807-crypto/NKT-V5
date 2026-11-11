import { CONFIG } from "./config.js";

const CACHE_PREFIX = "nkt-pubapi-v3:";

function getCached(key) {
  try {
    const item = JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || "null");
    if (item && Date.now() - item.savedAt < CONFIG.cacheTtlMs) return { data: item.data, cached: true };
  } catch { /* localStorage is optional */ }
  return null;
}
function saveCached(key, data) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), data })); }
  catch { /* Continue without browser cache */ }
}

export async function fetchJSON(url, cacheKey = url) {
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Chess.com API request failed (${response.status})`);
  const data = await response.json();
  saveCached(cacheKey, data);
  return { data, cached: false };
}

export function fetchClub() {
  return fetchJSON(`${CONFIG.apiBase}/club/${encodeURIComponent(CONFIG.clubSlug)}`);
}
export function fetchMembers() {
  return fetchJSON(`${CONFIG.apiBase}/club/${encodeURIComponent(CONFIG.clubSlug)}/members`);
}
export function getUniqueMembers(clubData) {
  const all = [ ...(clubData?.weekly || []), ...(clubData?.monthly || []), ...(clubData?.all_time || []) ];
  const seen = new Set();
  return all.filter(member => {
    const key = String(member?.username || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => Number(b.joined || 0) - Number(a.joined || 0));
}
export function getHighestElo(stats) {
  const formats = [
    { key: "chess_rapid", label: "Rapid" },
    { key: "chess_blitz", label: "Blitz" },
    { key: "chess_bullet", label: "Bullet" },
    { key: "chess_daily", label: "Daily" }
  ];
  let best = null;
  for (const format of formats) {
    const rating = stats?.[format.key]?.last?.rating;
    if (Number.isFinite(Number(rating)) && Number(rating) > 0 && (!best || Number(rating) > best.rating)) {
      best = { rating: Number(rating), label: format.label };
    }
  }
  return best;
}
export async function fetchPlayerBundle(username) {
  const safeName = encodeURIComponent(String(username).toLowerCase());
  const [profileResult, statsResult] = await Promise.all([
    fetchJSON(`${CONFIG.apiBase}/player/${safeName}`, `player:${safeName}`),
    fetchJSON(`${CONFIG.apiBase}/player/${safeName}/stats`, `stats:${safeName}`)
  ]);
  return { profile: profileResult.data, stats: statsResult.data };
}
