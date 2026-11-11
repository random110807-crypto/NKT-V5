import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from '../js/config.js';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const API = 'https://api.chess.com/pub';
const SLUG = 'nashediyon-ki-toli-nkt';
const UA = process.env.CHESSCOM_USER_AGENT || 'NKT-Club-Sidebar/1.0 (automated public-data collector)';
const now = new Date();
const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
async function getJson(url, { attempts = 2, timeoutMs = 10000 } = {}) {
  let last;
  for (let i=0; i<attempts; i++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
      if (response.status === 304) return null;
      if (response.status === 404 || response.status === 410) return null;
      if (response.status === 429 || response.status >= 500) {
        const retry = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(10000, retry*1000) : Math.min(8000, 1000*2**i));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.json();
    } catch (error) {
      last = error;
      if (i < attempts-1) await sleep(Math.min(3000, 500*2**i));
    }
  }
  throw last || new Error(`Request failed: ${url}`);
}
function validNumber(v) { return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null; }
function ratingSet(stats={}) {
  const out = {};
  for (const [key, label] of [['chess_rapid','Rapid'],['chess_blitz','Blitz'],['chess_bullet','Bullet']]) {
    const rating = validNumber(stats?.[key]?.last?.rating);
    if (rating) out[key] = rating;
  }
  return out;
}
function gameTotals(stats={}) {
  const out = { games: 0, wins: 0, losses: 0, draws: 0 };
  for (const key of ['chess_rapid','chess_blitz','chess_bullet']) {
    const record = stats?.[key]?.record || {};
    const w = Math.max(0, Number(record.win)||0), l = Math.max(0, Number(record.loss)||0), d = Math.max(0, Number(record.draw)||0);
    out.wins += w; out.losses += l; out.draws += d;
  }
  out.games = out.wins + out.losses + out.draws;
  return out;
}
function delta(a,b) { return Number.isFinite(a) && Number.isFinite(b) ? b-a : 0; }
function normalise(values, value) {
  const max = Math.max(1, ...values.map(v => Math.max(0, v)));
  return Math.max(0, value) / max;
}
function getMembers(payload) {
  const merged = [...(payload?.weekly||[]), ...(payload?.monthly||[]), ...(payload?.all_time||[])];
  const seen = new Set();
  return merged.filter(x => {
    const u = String(x?.username||'').trim().toLowerCase();
    if (!u || seen.has(u)) return false;
    seen.add(u); return true;
  }).sort((a,b) => Number(b.joined||0)-Number(a.joined||0));
}
function publicProfile(stats, username) {
  const ratings = ratingSet(stats);
  return { username, ratings, games: gameTotals(stats) };
}

await fs.mkdir(DATA, { recursive: true });
const statePath = path.join(DATA, 'nkt-state.json');
const previous = await readJson(statePath, { schema: 1, createdAt: now.toISOString(), members: {}, monthly: {}, matchIds: [] });
const state = { ...previous, members: previous.members || {}, monthly: previous.monthly || {}, matchIds: previous.matchIds || [], profiles: previous.profiles || {}, snapshots: previous.snapshots || [] };

// Fetch and validate the club endpoints before replacing any previously good dashboard.
const [club, memberPayload, matchPayload] = await Promise.all([
  getJson(`${API}/club/${SLUG}`),
  getJson(`${API}/club/${SLUG}/members`),
  getJson(`${API}/club/${SLUG}/matches`)
]);
if (!club || !memberPayload || !matchPayload) throw new Error('A required club endpoint returned no public data; retaining the previous published dashboard.');
const members = getMembers(memberPayload);
if (!members.length) throw new Error('Club members endpoint returned an empty roster; refusing to publish an empty leaderboard.');

const monthState = state.monthly[monthKey] || { startedAt: now.toISOString(), baselines: {} };
monthState.baselines ||= {};
const statsByUser = {};
let processed = 0, failed = 0;
console.log(`Found ${members.length} club members. Collecting player stats (serial requests to respect Chess.com rate limits)…`);
for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
  const member = members[memberIndex];
  const username = String(member.username).toLowerCase();
  try {
    // Serial requests are intentional: Chess.com warns that parallel traffic can trigger 429s.
    const stats = await getJson(`${API}/player/${encodeURIComponent(username)}/stats`);
    if (!stats) { failed++; continue; }
    const current = publicProfile(stats, username);
    const old = state.members[username];
    const oldGames = old?.games || { games: 0, wins: 0, losses: 0, draws: 0 };
    const lifetimeGameDelta = Math.max(0, current.games.games - oldGames.games);
    const monthlyBaseline = monthState.baselines[username];
    if (!monthlyBaseline) {
      monthState.baselines[username] = {
        ratings: current.ratings,
        games: current.games.games,
        rapid: current.ratings.chess_rapid ?? null,
        firstSeenAt: now.toISOString()
      };
    }
    const base = monthState.baselines[username];
    // One consistent rating pool: Rapid only. A member needs a valid baseline
    // and at least 24 hours of observation before becoming eligible.
    const baselineRapid = base.rapid != null && Number.isFinite(Number(base.rapid)) ? Number(base.rapid)
      : base.ratings?.chess_rapid != null && Number.isFinite(Number(base.ratings.chess_rapid)) ? Number(base.ratings.chess_rapid) : null;
    const currentRapid = current.ratings.chess_rapid != null && Number.isFinite(Number(current.ratings.chess_rapid)) ? Number(current.ratings.chess_rapid) : null;
    const baselineAt = Date.parse(base.firstSeenAt || now.toISOString());
    const monthStartAt = Date.parse(monthState.startedAt || now.toISOString());
    const observedHours = (now.getTime() - baselineAt) / 3600000;
    const baselineOffsetHours = (baselineAt - monthStartAt) / 3600000;
    // Baselines are accepted only from the first 12 hours of the month's first
    // successful collection, keeping all ranked players on a comparable window.
    const comparableMonthBaseline = baselineOffsetHours >= 0 && baselineOffsetHours <= 12;
    const ratingChange = baselineRapid !== null && currentRapid !== null && comparableMonthBaseline && observedHours >= 24
      ? currentRapid - baselineRapid : null;
    const formatChanges = ratingChange === null ? {} : { chess_rapid: ratingChange };
    const winDelta = Math.max(0, current.games.wins - oldGames.wins);
    const lossDelta = Math.max(0, current.games.losses - oldGames.losses);
    const drawDelta = Math.max(0, current.games.draws - oldGames.draws);
    const activity = { games: winDelta + lossDelta + drawDelta, wins: winDelta, losses: lossDelta, draws: drawDelta };
    statsByUser[username] = { ...current, joined: Number(member.joined)||null, monthly: { ratingChange, formatChanges, games: activity.games, wins: activity.wins, losses: activity.losses, draws: activity.draws } };
    state.members[username] = { ratings: current.ratings, games: current.games, lastSeenAt: now.toISOString(), joined: Number(member.joined)||null };
    processed++;
  } catch (error) {
    failed++;
    // Preserve the last known state for a member if a transient request fails.
    const old = state.members[username];
    if (old) statsByUser[username] = { username, ratings: old.ratings||{}, games: old.games||{}, joined: Number(member.joined)||null, monthly: { ratingChange: null, formatChanges: {}, games: 0, wins: 0, losses: 0, draws: 0 }, stale: true };
    console.warn(`Could not refresh ${username}: ${error.message}`);
  }
  if ((memberIndex + 1) % 10 === 0 || memberIndex + 1 === members.length) console.log(`Player stats progress: ${memberIndex + 1}/${members.length} (success ${processed}, failed ${failed})`);
  await sleep(150);
}
if (processed < Math.min(5, Math.ceil(members.length * 0.35))) throw new Error(`Only ${processed}/${members.length} member stats succeeded; refusing to publish an unreliable snapshot.`);
state.monthly[monthKey] = monthState;

const rows = Object.values(statsByUser).filter(x => !x.stale);
const eligibleRaceRows = rows.filter(x => Number.isFinite(x.monthly.ratingChange) && x.monthly.ratingChange > 0).sort((a,b)=>b.monthly.ratingChange-a.monthly.ratingChange);
const raceRows = eligibleRaceRows.slice(0,3).map((x,i)=>({ rank:i+1, username:x.username, ratingChange:x.monthly.ratingChange, formats:x.monthly.formatChanges, games:x.monthly.games, ratingType:'Rapid', rating:x.ratings?.chess_rapid ?? null }));
const overallRaw = rows.filter(x => (Number(x.monthly.ratingChange)||0) !== 0 || (Number(x.monthly.games)||0) > 0).map(x => ({
  ...x,
  ratingMetric: Math.max(0, Number(x.monthly.ratingChange)||0),
  gamesMetric: Math.max(0, Number(x.monthly.games)||0),
  winRate: x.monthly.games ? x.monthly.wins/x.monthly.games : 0
}));
const ratingValues = overallRaw.map(x=>x.ratingMetric), gameValues = overallRaw.map(x=>x.gamesMetric), winValues = overallRaw.map(x=>x.winRate);
const overallRows = overallRaw.map(x=>({
  username:x.username,
  ratingChange:x.monthly.ratingChange,
  games:x.monthly.games,
  wins:x.monthly.wins,
  losses:x.monthly.losses,
  draws:x.monthly.draws,
  // Member-level match participation is not exposed by the club matches endpoint.
  score: Math.round((normalise(ratingValues,x.ratingMetric)*50 + normalise(gameValues,x.gamesMetric)*35 + normalise(winValues,x.winRate)*15)*10)/10,
  scoreBasis: 'rating progress 50% · game activity 35% · game win rate 15%'
})).sort((a,b)=>b.score-a.score).map((x,i)=>({...x,rank:i+1}));

// Refresh profile avatars for the most visible members, with a seven-day cache.
const configuredMcaRows = CONFIG.mcaLeaderboard?.length ? CONFIG.mcaLeaderboard : (CONFIG.clubhouse?.mcaLeaderboard || []);
const manualMcaRows = configuredMcaRows.filter(x => String(x?.username || '').trim()).slice(0,3);
const manualSpotlight = CONFIG.clubhouse?.memberOfTheMonth?.username ? [CONFIG.clubhouse.memberOfTheMonth] : [];
const visibleUsernames = [...new Set([...overallRows.slice(0,12), ...raceRows, ...manualMcaRows, ...manualSpotlight].map(x=>String(x.username).toLowerCase()))].slice(0,20);
const profileData = {};
for (const username of visibleUsernames) {
  const cached = state.profiles[username];
  let profile = cached && now.getTime() - Date.parse(cached.fetchedAt || 0) < 7*86400000 ? cached : null;
  if (!profile) {
    try {
      const result = await getJson(`${API}/player/${encodeURIComponent(username)}`);
      profile = { avatar: typeof result?.avatar === 'string' ? result.avatar : null, name: result?.name || null, fetchedAt: now.toISOString() };
      state.profiles[username] = profile;
      await sleep(150);
    } catch (error) { console.warn(`Profile image unavailable for ${username}: ${error.message}`); profile = cached || {}; }
  }
  profileData[username] = profile;
}
for (const row of [...overallRows, ...raceRows]) {
  const profile = profileData[row.username] || state.profiles[row.username] || {};
  row.avatar = profile.avatar || null;
  if (profile.name) row.displayName = profile.name;
}

const matchBuckets = ['registered','in_progress'];
const matches = matchBuckets.flatMap(status => (matchPayload?.[status]||[]).map(m=>({
  id: m['@id'] || `${m.name||'match'}-${m.start_time||''}`,
  name: m.name || 'Club team match',
  opponent: typeof m.opponent === 'string' ? m.opponent.split('/').filter(Boolean).at(-1) : null,
  startTime: Number(m.start_time)||null,
  endTime: Number(m.end_time)||null,
  timeClass: m.time_class || null,
  status,
  url: typeof m.url === 'string' && /^https:\/\//i.test(m.url) ? m.url : null
}))).filter(m=>(m.status==='in_progress' && (!m.endTime || m.endTime*1000>Date.now())) || (m.status==='registered' && m.startTime && m.startTime*1000>Date.now()))
  .sort((a,b)=>a.status===b.status?(a.startTime||0)-(b.startTime||0):(a.status==='in_progress'?-1:1));
const finished = (matchPayload?.finished || []).map(m=>({ result: m.result || null }));
const clubRecord = finished.reduce((r,m)=>{ if(m.result==='win')r.wins++; else if(m.result==='loss')r.losses++; else if(m.result==='draw')r.draws++; return r; },{wins:0,losses:0,draws:0});

// Recent joiners are based on the public joined timestamp, not the activity buckets.
const recentMembers = members.slice(0,3).map(m=>({ username:m.username, joined:Number(m.joined)||null }));
const topImproved = [...raceRows].filter(x=>x.ratingChange>0).sort((a,b)=>b.ratingChange-a.ratingChange)[0] || null;

// Persist factual aggregate snapshots. Insights intentionally begin at the first successful run.
const ratingValuesNow = rows.flatMap(x => Object.values(x.ratings || {}).filter(v => Number.isFinite(v) && v > 0));
const snapshot = {
  at: now.toISOString(),
  date: now.toISOString().slice(0,10),
  memberCount: Number(club.members_count) || members.length,
  totalGames: rows.reduce((sum,x)=>sum+(Number(x.games?.games)||0),0),
  avgRating: ratingValuesNow.length ? Math.round(ratingValuesNow.reduce((a,b)=>a+b,0)/ratingValuesNow.length) : null,
  activeMembers: rows.filter(x => (Number(x.monthly.games)||0)>0).length
};
state.snapshots.push(snapshot);
// Preserve historical snapshots across months; cap only to a generous safety ceiling.
state.snapshots = state.snapshots.slice(-4000);
const daily = new Map();
for (const point of state.snapshots) daily.set(point.date, point);
const dailyPoints = [...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
const firstPoint = dailyPoints[0] || snapshot;
const lastPoint = dailyPoints.at(-1) || snapshot;
const avgRatingChange = firstPoint.avgRating != null && lastPoint.avgRating != null ? lastPoint.avgRating-firstPoint.avgRating : 0;
const clubInsights = {
  periodDays: Math.max(1, Math.ceil((Date.parse(lastPoint.at)-Date.parse(firstPoint.at))/86400000)+1),
  gamesPlayed: Math.max(0, lastPoint.totalGames-firstPoint.totalGames),
  avgRatingChange,
  memberGrowth: lastPoint.memberCount-firstPoint.memberCount,
  activeMembers: lastPoint.activeMembers,
  series: dailyPoints.map((point,index)=>({ date: point.date, games: Math.max(0,point.totalGames-firstPoint.totalGames), memberCount: point.memberCount, avgRating: point.avgRating }))
};
const dashboard = {
  schema: 2,
  generatedAt: now.toISOString(),
  source: 'Chess.com PubAPI',
  club: { name: club.name || 'Nashediyon Ki Toli', slug: SLUG, memberCount: Number(club.members_count)||members.length, dailyRating: Number(club.average_daily_rating)||null, url: `https://www.chess.com/club/${SLUG}` },
  freshness: { memberRoster: 'Chess.com may cache public endpoint responses for up to 12 hours.', playerStatsProcessed: processed, playerStatsFailed: failed, membersTotal: members.length },
  recentMembers,
  monthlyRace: { month: monthKey, startedAt: monthState.startedAt, eligibleCount: eligibleRaceRows.length, methodology: 'Top three positive Rapid rating improvements from baselines collected within the first 12 hours of the first monthly run. A 24-hour observation period is required; missing or late Rapid baselines are excluded.', rows: raceRows },
  overallLeaderboard: { month: monthKey, methodology: 'Automated member score: rating progress 50%, games played 35%, game win rate 15%. Individual team-match participation is not exposed by the public club matches endpoint and is not included.', rows: overallRows.slice(0,50) },
  clubMatches: { record: clubRecord, totals: { registered: matches.filter(m=>m.status==='registered').length, inProgress: matches.filter(m=>m.status==='in_progress').length, finished: finished.length }, matches: matches.slice(0,30), limitation: 'Club-level match results only; the public endpoint does not identify individual member contributions.' },
  profiles: profileData,
  clubInsights,
  notes: { history: 'Tracking begins at first successful automation run. New members become eligible after their first successful baseline snapshot.', unsupported: ['MCA points leaderboard','Vote Chess event feed and standings','individual club-match contribution leaderboard'] }
};

state.updatedAt = now.toISOString();
state.lastSuccessfulMonth = monthKey;
await writeJson(statePath, state);
await writeJson(path.join(DATA,'nkt-dashboard.json'), dashboard);
console.log(`Published NKT dashboard: ${processed}/${members.length} player stats; ${raceRows.length} monthly rating entries; ${matches.length} club matches.`);
