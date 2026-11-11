import { CONFIG } from "./config.js";
import { fetchClub, fetchMembers, fetchPlayerBundle, getUniqueMembers, getHighestElo } from "./chess-api.js";
import { renderClub, renderRecentMembers, showClubError, showMembersError, applyBrandAssets, applyConfiguredLinks } from "./ui.js";
import { renderDailyQuote } from "./quotes.js";
import { initClubhouse } from "./clubhouse.js";
import { initCompetitions } from "./competitions.js";
import { initWorldClock } from "./world-clock.js";
import { initMusicPlayer } from "./music-player.js";

async function loadClubData() {
  try {
    const club = await fetchClub();
    renderClub(club.data, club.cached);
  } catch (error) {
    showClubError(error.message.includes("404") ? "Club profile not found. Check the club ID in js/config.js." : "Chess.com club profile is temporarily unavailable.");
  }

  try {
    const membersResult = await fetchMembers();
    const roster = getUniqueMembers(membersResult.data);
    if (!roster.length) { renderRecentMembers([], new Map()); return; }
    const recent = roster.slice(0, CONFIG.recentMemberCount);
    const toFetch = recent;
    const bundles = new Map();
    // Match the uploaded working reference: profile + stats are fetched together for each member.
    // Limit concurrency to four members so the public API is not flooded.
    for (let i = 0; i < toFetch.length; i += 4) {
      const batch = toFetch.slice(i, i + 4);
      const results = await Promise.all(batch.map(async member => {
        try {
          const bundle = await fetchPlayerBundle(member.username);
          return [member.username.toLowerCase(), { ...bundle, best: getHighestElo(bundle.stats) }];
        } catch { return [member.username.toLowerCase(), { profile: {}, stats: {}, best: null }]; }
      }));
      results.forEach(([name, bundle]) => bundles.set(name, bundle));
    }
    renderRecentMembers(recent, bundles);
  } catch (error) {
    showMembersError(error.message.includes("404") ? "Chess.com did not return a public member list for this club." : "Member data is temporarily unavailable. Try again later.");
  }
}

function initViews() {
  const views = ["home-view", "music-view", "clubhouse-view", "competitions-view"]
    .map(id => document.getElementById(id));
  function show(target) {
    views.forEach(view => { view.hidden = view !== target; });
    const back = target.querySelector("[data-back-home], #back-home");
    window.scrollTo({ top: 0 });
    if (back) back.focus({ preventScroll: true });
  }
  // Header Music shortcut opens the existing music view (same player, playlist and audio element).
  document.getElementById("open-music").addEventListener("click", () => show(document.getElementById("music-view")));
  const audio = document.getElementById("audio-player");
  const pill = document.getElementById("open-music");
  audio.addEventListener("play", () => pill.classList.add("is-playing"));
  // "emptied" fires when the player switches tracks (it pauses and reloads without a pause event).
  ["pause", "emptied", "ended", "error"].forEach(type => audio.addEventListener(type, () => pill.classList.remove("is-playing")));
  document.getElementById("open-clubhouse").addEventListener("click", () => show(document.getElementById("clubhouse-view")));
  document.getElementById("open-competitions").addEventListener("click", () => show(document.getElementById("competitions-view")));
  document.getElementById("back-home").addEventListener("click", () => show(views[0]));
  document.querySelectorAll("[data-back-home]").forEach(button => button.addEventListener("click", () => show(views[0])));
}

async function loadAutomatedDashboard() {
  try {
    const response = await fetch(`data/nkt-dashboard.json?updated=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Dashboard data unavailable (${response.status})`);
    const dashboard = await response.json();
    if (dashboard?.schema !== 2) throw new Error("Dashboard schema is not ready yet");
    renderClubhouse(dashboard);
    renderCompetitions(dashboard);
    return dashboard;
  } catch (error) {
    console.warn("NKT automated dashboard is not published yet:", error.message);
    renderClubhouse(null);
    renderCompetitions(null);
    return null;
  }
}

applyBrandAssets(CONFIG);
applyConfiguredLinks(CONFIG);
renderDailyQuote();
initViews();
const renderClubhouse = initClubhouse(CONFIG);
const renderCompetitions = initCompetitions(CONFIG);
initWorldClock();
initMusicPlayer();
loadAutomatedDashboard();
loadClubData();

