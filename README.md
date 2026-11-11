# NKT — Nashediyon Ki Toli Chess.com Sidebar

A static, narrow-layout Chess.com club sidebar using the existing dark emerald and antique-gold identity. The original navigation, branding, image assets, music player, quotes, world clock, recent members and GitHub Actions collector are retained.

## What changed

- **Most Improved · Monthly:** the Club House now displays only the top three positive monthly improvements in a three-level podium. The comparison uses Rapid rating only, so players are not compared by adding unrelated rating formats together. A player must have a valid Rapid baseline from the first 12 hours of the month's first successful collection and at least 24 hours of observation to qualify.
- **MCA Top Performers:** manually configured, sorted by points, limited to three, and hidden when no valid entries exist in production mode.
- **Events:** NKT Clash of Clubs (MCA) and Vote Chess have separate sections. MCA is shown first and receives the featured gold treatment. Upcoming events have a live D/H/M/S countdown; active events show LIVE NOW. Finished events are filtered or hidden.
- **Manual event fallback:** MCA and Vote Chess events are configured in `js/config.js`. This is intentional: the public club team-matches feed does not provide a dependable Vote Chess feed or MCA points table.
- **Club Competitions:** the page is refined and keeps active/upcoming public club team matches separate from manually configured MCA and Vote Chess events.
- **Demo mode:** preview data is stored centrally in `CONFIG.demoData`, clearly marked as sample data, and never written into the automation state or dashboard.
- **Club Insights:** removed from the Club House.
- **Member of the Month:** retained only as an optional manual spotlight. It is never selected automatically.
- **Home milestone progress:** corrected to calculate progress within the current 500-member milestone interval, with clamping.
- **Motion:** podium entrances, card hover lighting and event interactions respect `prefers-reduced-motion`.

## Configuration guide

All manual configuration is in `js/config.js`.

### 1. Demo mode

```js
demoMode: true
```

- `true`: real data is preferred when available; sample data fills missing preview sections and is marked DEMO.
- `false`: only real automated and manually configured records appear. Empty manual MCA or event sections remain hidden.
- For a production deployment, set `demoMode: false`. `demoMode` takes precedence over the backward-compatible `DEMO_MODE` property.

Demo records are read only by the browser UI. The Node collector never writes demo records to `data/nkt-state.json` or `data/nkt-dashboard.json`.

### 2. MCA Top Performers

Add up to any number of entries; the UI sorts by points and displays only the top three.

```js
mcaLeaderboard: [
  { name: "Player One", username: "player_one", points: 120, avatar: "" },
  { name: "Player Two", username: "player_two", points: 98, avatar: "" },
  { name: "Player Three", username: "player_three", points: 76, avatar: "" }
],
```

- `username` is the Chess.com username and is required.
- `points` must be a positive number.
- `name` is an optional display name.
- `avatar` is optional. If blank, the automation attempts to retrieve the public Chess.com profile avatar. If no avatar is available, a unique initials-based fallback is generated for that username.
- The entire section is hidden in production mode when no valid entries exist.

### 3. Manual MCA and Vote Chess events

The Chess.com public club matches endpoint is used for public team matches only. The current project does not assume that it exposes Vote Chess events or MCA points. Configure those event types manually:

```js
events: {
  mca: [
    {
      title: "NKT CLASH OF CLUBS",
      type: "mca",
      opponent: "Opponent Club",
      startAt: "2026-12-01T18:30:00+05:30",
      endAt: "2026-12-01T20:30:00+05:30",
      url: "https://www.chess.com/your-actual-event-page"
    }
  ],
  voteChess: [
    {
      title: "NKT Vote Chess Challenge",
      type: "voteChess",
      opponent: "Opponent / game details",
      startAt: "2026-12-02T19:00:00+05:30",
      endAt: "2026-12-03T19:00:00+05:30",
      url: "https://www.chess.com/your-actual-game-page"
    }
  ]
},
```

Use the real event/game URL copied from Chess.com; the project does not construct or guess event links. `startAt` and `endAt` should be ISO 8601 values with an explicit timezone offset. `endAt` is required so the card can disappear automatically after the event ends; entries without a valid end timestamp are ignored. A card is shown only while upcoming or active. An expired event is not displayed.

When `demoMode` is true, sample events fill only the event categories that do not have a valid manual event configured. Each sample card is labelled DEMO PREVIEW.

### 4. Member of the Month (manual only)

The optional manual spotlight is retained for compatibility. It is not automatically selected. Leave it `null` to hide it:

```js
clubhouse: {
  memberOfTheMonth: {
    name: "Player Name",
    username: "chesscom_username",
    avatar: "",
    rating: 1800,
    ratingType: "Rapid",
    achievement: "Recognised by the NKT team"
  }
},
```

The profile picture is retrieved from Chess.com when possible if `avatar` is blank; otherwise a unique initials-based fallback is used.

### 5. Demo preview data

Edit `demoData` in `js/config.js` to change sample podium players, MCA sample standings and sample events. Do not copy demo records into the production JSON data files.

## Monthly improvement methodology and history

- The collector uses the UTC calendar month as its monthly boundary.
- The first successful collection of a month establishes the month boundary. A member's baseline is accepted only when collected within the first 12 hours of that first run.
- A member is eligible only after a valid Rapid baseline collected within the first 12 hours of the month's first successful collection, a current Rapid rating and at least 24 hours between baseline and current observation. Members first observed later in the month are excluded until the next monthly cycle.
- Monthly improvement is `current Rapid rating - first observed Rapid rating for the month`.
- Only positive changes are ranked. The podium contains at most three entries, sorted descending.
- Missing Rapid values, incomplete baselines and players with less than 24 hours of observation are excluded; missing values are never treated as zero.
- A new month gets a new baseline map. Earlier monthly baseline records and historical snapshots are retained in `data/nkt-state.json`.
- History starts at the first successful automation run after deployment. The collector does not invent pre-deployment ratings.
- The automation continues to collect lifetime games/wins/losses/draws deltas for the separate overall activity ranking. Those games are general Chess.com games, not necessarily NKT team matches.

## Public API limitations and event links

The automation uses Chess.com PubAPI public endpoints for club profile, member roster, member stats, player profiles and club team matches. It does not infer individual MCA points or Vote Chess scores from team-match records. Public team-match cards link only when the API record contains a valid HTTPS `url`; otherwise no misleading Join button is shown.

If the live club team-match response changes or does not contain an event page URL, the event remains visible without a guessed link. Use the manual event configuration above when an actual page URL is known.

## Project structure

```text
NKT-Final-Sidebar/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js
│   ├── clubhouse.js
│   ├── competitions.js
│   ├── event-utils.js
│   └── existing sidebar modules
├── assets/images/
├── assets/music/
├── scripts/update-nkt-data.mjs
├── data/nkt-state.json
├── data/nkt-dashboard.json
├── .github/workflows/update-nkt-data.yml
└── package.json
```

## Deploy and run

1. Upload the complete project folder to the GitHub repository.
2. In `js/config.js`, set `demoMode: false` before production use and add manual MCA/event records as needed.
3. Enable GitHub Actions write permissions: **Settings → Actions → General → Workflow permissions → Read and write permissions**.
4. Run **Actions → Update NKT automated sidebar data → Run workflow** once to establish the first rating baselines.
5. The workflow runs every six hours and commits `data/nkt-state.json` and `data/nkt-dashboard.json`.
6. Publish the project root with GitHub Pages so `data/nkt-dashboard.json` remains available at that relative path.
7. The browser uses the published dashboard for automated data; it does not fetch the entire club roster's stats itself.

Requires Node.js 20 or newer. No npm runtime dependencies are required.

```bash
npm run update:data
```

## Validation performed for this update

- JavaScript syntax checks (`node --check`) for every `.js` and `.mjs` file.
- JSON parsing checks for project JSON files.
- Project ZIP integrity check after packaging.
- Milestone percentage boundary checks.
- Static inspection of the automation's monthly baseline, ranking, event filtering and profile-cache logic.

A live Chess.com API collection and in-browser visual test could not be completed in this environment. The workflow must be run from the GitHub repository with network access to verify current live endpoint responses and event URLs.
