// NKT sidebar configuration. Edit this file to manage previews, leaderboards and events.
const demoMcaStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const demoMcaEnd = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
const demoVoteStart = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const demoVoteEnd = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

export const CONFIG = {
  clubSlug: "nashediyon-ki-toli-nkt",
  clubUrl: "https://www.chess.com/club/nashediyon-ki-toli-nkt",
  apiBase: "https://api.chess.com/pub",
  cacheTtlMs: 30 * 60 * 1000,
  recentMemberCount: 3,

  clubLogoPath: "assets/images/nkt-club-logo.png",
  sidebarBackgroundPath: "assets/images/nkt-sidebar-background.jpg",
  links: {
    feedback: "",
    adminApplication: "",
    clubCompetitions: "https://www.chess.com/clubs/matches/nashediyon-ki-toli-nkt",
    interestingForums: "https://www.chess.com/clubs/forum/nashediyon-ki-toli-nkt"
  },

  // TRUE previews sample records marked DEMO. Set FALSE for production data only.
  demoMode: false,
  // Backward-compatible alias for older builds; demoMode takes precedence.
  DEMO_MODE: false,

  // Manual MCA leaderboard. Only the best three valid entries are displayed.
  // Example: { name: "Player One", username: "player_one", points: 120, avatar: "" }
  mcaLeaderboard: [],

  // Optional manually selected spotlight. Never selected automatically.
  clubhouse: {
    memberOfTheMonth: null
    // Example: { name: "Player Name", username: "chesscom_username", avatar: "", rating: 1800, ratingType: "Rapid", achievement: "Club contribution" }
  },

  // Manual events are required for MCA and Vote Chess: the public club matches
  // endpoint does not expose a dependable Vote Chess event feed or MCA scoring.
  // type must be "mca" or "voteChess". Use ISO 8601 timestamps WITH timezone.
  // endAt is optional; when supplied, the event disappears after it ends.
  events: {
    mca: [],
    voteChess: []
  },

  // Other existing featured competitions can still be configured here.
  featuredCompetitions: [],

  // All sample records are isolated here and never enter automation history.
  demoData: {
    mostImproved: [
      { username: "demo_player_one", displayName: "Demo Player One", ratingChange: 84, games: 26, ratings: { chess_rapid: 1684 }, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-Demo-One" },
      { username: "demo_player_two", displayName: "Demo Player Two", ratingChange: 61, games: 19, ratings: { chess_rapid: 1542 }, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-Demo-Two" },
      { username: "demo_player_three", displayName: "Demo Player Three", ratingChange: 43, games: 15, ratings: { chess_rapid: 1428 }, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-Demo-Three" }
    ],
    mcaLeaderboard: [
      { name: "Demo MCA Champion", username: "demo_mca_one", points: 120, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-MCA-One" },
      { name: "Demo Runner-up", username: "demo_mca_two", points: 98, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-MCA-Two" },
      { name: "Demo Third Place", username: "demo_mca_three", points: 76, avatar: "https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=NKT-MCA-Three" }
    ],
    events: [
      { id: "demo-mca", type: "mca", title: "NKT CLASH OF CLUBS", opponent: "Demo Rival Club", startAt: demoMcaStart, endAt: demoMcaEnd, url: "https://www.chess.com/clubs/matches/nashediyon-ki-toli-nkt" },
      { id: "demo-vote", type: "voteChess", title: "NKT Vote Chess Challenge", opponent: "Demo Opponent", startAt: demoVoteStart, endAt: demoVoteEnd, url: "https://www.chess.com/clubs/matches/nashediyon-ki-toli-nkt" }
    ]
  },

  tracks: [
    { title: "The First Move", file: "assets/music/01-the-first-move.mp3" },
    { title: "Midnight Gambit", file: "assets/music/02-midnight-gambit.mp3" },
    { title: "Quiet Calculations", file: "assets/music/03-quiet-calculations.mp3" },
    { title: "The King's March", file: "assets/music/04-the-kings-march.mp3" },
    { title: "After the Checkmate", file: "assets/music/05-after-the-checkmate.mp3" }
  ]
};
