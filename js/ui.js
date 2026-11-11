const FALLBACK_AVATAR = "https://www.chess.com/bundles/web/images/user-image.007dad08.svg";
const byId = id => document.getElementById(id);
export function setText(id, value) { const el = byId(id); if (el) el.textContent = value; }

export function applyBrandAssets(config) {
  const logo = byId("club-logo");
  if (logo) {
    logo.src = new URL(`../${config.clubLogoPath}`, import.meta.url).href;
    logo.addEventListener("load", () => {
      logo.hidden = false;
      byId("brand-crest")?.classList.add("has-logo");
    }, { once: true });
    logo.addEventListener("error", () => { logo.hidden = true; }, { once: true });
  }
  const sidebar = byId("sidebar");
  if (sidebar && config.sidebarBackgroundPath) {
    const url = new URL(`../${config.sidebarBackgroundPath}`, import.meta.url).href;
    sidebar.style.setProperty("--nkt-custom-bg", `url("${url}")`);
  }
}

export function renderClub(profile, cached) {
  setText("member-count", Number.isFinite(profile.members_count) ? profile.members_count.toLocaleString() : "—");
  setText("daily-rating", Number.isFinite(profile.average_daily_rating) ? profile.average_daily_rating.toLocaleString() : "—");
  const year = profile.created ? new Date(profile.created * 1000).getFullYear() : "—";
  setText("club-year", year); setText("footer-year", year);
  const count = Number(profile.members_count);
  if (Number.isFinite(count) && count >= 0) renderMilestone(count);
  const state = byId("api-state");
  if (state) { state.textContent = cached ? "CACHED" : "CONNECTED"; state.parentElement.dataset.state = "live"; }
}

function renderMilestone(count) {
  const target = (Math.floor(count / 500) + 1) * 500;
  const start = target - 500;
  const span = target - start;
  const progress = span > 0 ? Math.max(0, Math.min(100, ((count - start) / span) * 100)) : 0;
  setText("milestone-current", count.toLocaleString());
  setText("milestone-target", `NEXT · ${target.toLocaleString()}`);
  setText("milestone-label", `${Math.max(0, count - start).toLocaleString()} / ${span.toLocaleString()}`);
  setText("milestone-caption", `${Math.round(progress)}% of the way from ${start.toLocaleString()} to ${target.toLocaleString()} members`);
  const fill = byId("milestone-fill");
  if (fill) fill.style.width = `${progress}%`;
}

const NEWEST_KEY = "nkt-newest-member-seen";

function formatJoined(member) {
  return new Date(Number(member.joined) * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// The newest member is whoever has the latest real `joined` timestamp in the fetched Chess.com data.
function findNewest(members) {
  let newest = null;
  for (const m of members) {
    const t = Number(m?.joined);
    if (Number.isFinite(t) && t > 0 && (!newest || t > Number(newest.joined))) newest = m;
  }
  return newest;
}

function rememberNewest(username) {
  try {
    const previous = localStorage.getItem(NEWEST_KEY);
    localStorage.setItem(NEWEST_KEY, username.toLowerCase());
    return previous !== username.toLowerCase();   // true when this member has not been seen here before
  } catch { return true; }
}

function makeMemberRow(member, bundle, showJoined = true, options = {}) {
  const profile = bundle?.profile || {};
  const best = bundle?.best || null;
  const row = document.createElement("div"); row.className = "member-row";
  if (options.index !== undefined) row.style.setProperty("--i", options.index);
  const avatar = document.createElement("img"); avatar.className = "avatar"; avatar.alt = ""; avatar.loading = "lazy";
  avatar.width = 34; avatar.height = 34;
  avatar.src = profile.avatar || FALLBACK_AVATAR; avatar.onerror = () => { avatar.onerror = null; avatar.src = FALLBACK_AVATAR; }; // fall back once, never loop
  const copy = document.createElement("div"); copy.className = "member-copy";
  const link = document.createElement("a"); link.href = `https://www.chess.com/member/${encodeURIComponent(member.username)}`;
  link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = `@${member.username}`;
  const meta = document.createElement("small");
  meta.textContent = best ? `${best.label}: ${best.rating.toLocaleString()}` : "Unrated · Chess.com member";
  copy.append(link, meta);
  if (showJoined && member.joined) {
    const joined = document.createElement("span"); joined.className = "joined-date";
    joined.textContent = formatJoined(member);
    if (options.newest) {
      row.classList.add("member-row--newest");
      if (options.arriving) row.classList.add("is-arriving");
      const side = document.createElement("span"); side.className = "member-side";
      const badge = document.createElement("span"); badge.className = "newest-badge";
      const hours = (Date.now() - Number(member.joined) * 1000) / 3600000;
      badge.textContent = hours < 48 ? "JUST JOINED" : "NEW";
      side.append(badge, joined);
      row.append(avatar, copy, side);
    } else row.append(avatar, copy, joined);
  } else row.append(avatar, copy);
  return row;
}

export function renderRecentMembers(members, bundles) {
  const root = byId("recent-members"); root.replaceChildren();
  if (!members.length) { const p=document.createElement("p"); p.className="empty-state"; p.textContent="No member records were returned by Chess.com."; root.append(p); return; }
  const newest = findNewest(members);
  const arriving = newest ? rememberNewest(newest.username) : false;
  members.forEach((member, index) => {
    const isNewest = newest && member === newest;
    root.append(makeMemberRow(member, bundles.get(member.username.toLowerCase()), true, { index, newest: isNewest, arriving: isNewest && arriving }));
  });
}

export function showMembersError(message) {
  for (const id of ["recent-members"]) {
    const root=byId(id); if (!root) continue; root.replaceChildren();
    const p=document.createElement("p"); p.className="empty-state"; p.textContent=message; root.append(p);
  }
}
export function showClubError(message) {
  setText("club-status", message);
  const state=byId("api-state"); if (state) { state.textContent="OFFLINE"; state.parentElement.dataset.state="error"; }
}


export function applyConfiguredLinks(config) {
  // Both cards are always visible. A valid HTTPS Google Form URL from config.js is used when set;
  // otherwise the card keeps its default link (the club's Chess.com pages) from index.html.
  const entries = [
    ["feedback-link", config.links?.feedback],
    ["admin-link", config.links?.adminApplication]
  ];
  entries.forEach(([id, value]) => {
    const link = byId(id);
    if (!link) return;
    link.hidden = false;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") throw new Error("Invalid URL");
      link.href = url.href;
    } catch { /* keep default href */ }
    link.target = "_blank"; link.rel = "noopener noreferrer";
  });
}
