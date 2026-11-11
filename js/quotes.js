// Original NKT lines, not attributed to historical players.
const QUOTES = [
  "A position does not become simple because the pieces have disappeared; it becomes simple when the mind learns what to ignore.",
  "Some of the strongest moves are made after the urge to move has passed.",
  "A good player sees the move. A growing player asks what the move changes.",
  "The board remembers every decision, but it never asks you to remain the player who made it.",
  "Patience is not the absence of ambition; it is ambition that has learned to calculate.",
  "There is a quiet kind of courage in returning to the board after a difficult game.",
  "The pieces may be equal in number, but never in the stories we give them."
];

export function renderDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  const quote = QUOTES[((day % QUOTES.length) + QUOTES.length) % QUOTES.length];
  document.getElementById("daily-quote").textContent = `“${quote}”`;
  document.getElementById("quote-credit").textContent = "— NKT Archive";
}
