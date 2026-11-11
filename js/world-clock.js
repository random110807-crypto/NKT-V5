// Compact world clock: one primary clock (with seconds) plus a short list of cities.
// All conversion is done by the browser's IANA time-zone database via Intl.DateTimeFormat,
// so daylight-saving changes are handled automatically. No UTC offsets are calculated by hand.
const CITIES = [
  { id: "delhi",    name: "New Delhi", zone: "Asia/Kolkata" },
  { id: "london",   name: "London",    zone: "Europe/London" },
  { id: "newyork",  name: "New York",  zone: "America/New_York" },
  { id: "tokyo",    name: "Tokyo",     zone: "Asia/Tokyo" }
];
const DEFAULT_ID = "delhi"; // Asia/Kolkata

export function initWorldClock() {
  const root = document.getElementById("world-clock");
  if (!root || root.dataset.ready === "true") return; // never bind twice
  root.dataset.ready = "true";

  // Build the formatters once per city (creating them every tick would be wasteful).
  const fmt = new Map();
  CITIES.forEach(city => {
    try {
      fmt.set(city.id, {
        full: new Intl.DateTimeFormat("en-US", { timeZone: city.zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h12" }),
        short: new Intl.DateTimeFormat("en-US", { timeZone: city.zone, hour: "numeric", minute: "2-digit", hourCycle: "h12" }),
        date: new Intl.DateTimeFormat("en-US", { timeZone: city.zone, weekday: "short", day: "numeric", month: "short" })
      });
    } catch { /* unsupported zone: city is skipped below */ }
  });
  const cities = CITIES.filter(c => fmt.has(c.id));
  if (!cities.length) { root.textContent = "Clock unavailable"; return; }

  let primaryId = cities.some(c => c.id === DEFAULT_ID) ? DEFAULT_ID : cities[0].id;
  let secondTimer = 0, minuteTimer = 0;

  // --- DOM (built once; only text changes afterwards) -------------------------------
  const primary = document.createElement("div");
  primary.className = "wc-primary";
  primary.setAttribute("role", "timer");
  const pCity = document.createElement("span"); pCity.className = "wc-city";
  const pRow = document.createElement("div"); pRow.className = "wc-time-row";
  const pTime = document.createElement("strong"); pTime.className = "wc-time";
  const pMeridiem = document.createElement("span"); pMeridiem.className = "wc-meridiem";
  pRow.append(pTime, pMeridiem);
  const pDate = document.createElement("small"); pDate.className = "wc-date";
  primary.append(pCity, pRow, pDate);

  const list = document.createElement("div");
  list.className = "wc-list";
  root.append(primary, list);

  function renderList() {
    list.replaceChildren();
    cities.filter(c => c.id !== primaryId).forEach(city => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "wc-chip"; button.dataset.city = city.id;
      button.setAttribute("aria-label", `Show ${city.name} as the main clock`);
      const name = document.createElement("span"); name.className = "wc-chip-name"; name.textContent = city.name;
      const time = document.createElement("span"); time.className = "wc-chip-time";
      button.append(name, time); list.append(button);
    });
    updateSecondary();
  }

  function setText(node, value) { if (node.textContent !== value) node.textContent = value; }

  function updatePrimary(now = new Date()) {
    const city = cities.find(c => c.id === primaryId);
    const parts = fmt.get(city.id).full.formatToParts(now);
    const get = type => parts.find(p => p.type === type)?.value || "";
    setText(pCity, city.name);
    setText(pTime, `${get("hour")}:${get("minute")}:${get("second")}`);
    setText(pMeridiem, get("dayPeriod"));
    setText(pDate, fmt.get(city.id).date.format(now));
  }

  function updateSecondary(now = new Date()) {
    list.querySelectorAll(".wc-chip").forEach(button => {
      const f = fmt.get(button.dataset.city);
      setText(button.querySelector(".wc-chip-time"), f.short.format(now));
    });
  }

  // --- Timers: re-aligned to the real clock on every tick, so a throttled or
  // sleeping tab can never drift; paused while hidden, refreshed when visible again.
  function tickSeconds() { updatePrimary(); secondTimer = setTimeout(tickSeconds, 1000 - (Date.now() % 1000) + 5); }
  function tickMinutes() { updateSecondary(); minuteTimer = setTimeout(tickMinutes, 60000 - (Date.now() % 60000) + 50); }
  function start() { stop(); tickSeconds(); tickMinutes(); }
  function stop() { clearTimeout(secondTimer); clearTimeout(minuteTimer); }

  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  // One delegated listener for every secondary city.
  list.addEventListener("click", event => {
    const button = event.target.closest(".wc-chip");
    if (!button) return;
    primaryId = button.dataset.city;       // promote; the old primary returns to the list
    renderList(); updatePrimary();
    primary.classList.remove("wc-swap"); void primary.offsetWidth; primary.classList.add("wc-swap");
    list.querySelector(".wc-chip")?.focus({ preventScroll: true });
  });

  renderList();
  start();
}
