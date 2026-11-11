import { CONFIG } from "./config.js";

export function initMusicPlayer() {
  const audio = document.getElementById("audio-player");
  const selectList = document.getElementById("track-list");
  const playButton = document.getElementById("play-toggle");
  const repeatButton = document.getElementById("repeat-toggle");
  const seek = document.getElementById("seek");
  const current = document.getElementById("current-time");
  const duration = document.getElementById("duration");
  const feedback = document.getElementById("music-feedback");
  const dot = document.querySelector(".playing-dot");
  let index = 0;
  let loaded = false;

  const formatTime = value => {
    if (!Number.isFinite(value)) return "0:00";
    const min = Math.floor(value / 60);
    const sec = Math.floor(value % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  function paintSelection() {
    selectList.querySelectorAll(".track-item").forEach((button, i) => {
      button.classList.toggle("active", i === index);
      button.setAttribute("aria-current", i === index ? "true" : "false");
    });
  }

  function loadTrack(nextIndex) {
    index = (nextIndex + CONFIG.tracks.length) % CONFIG.tracks.length;
    const track = CONFIG.tracks[index];
    loaded = false;
    audio.pause();
    audio.src = new URL(`../${track.file}`, import.meta.url).href;
    audio.load();

    document.getElementById("track-title").textContent = track.title;
    document.getElementById("track-subtitle").textContent = `NKT Sound Archive · Track ${String(index + 1).padStart(2, "0")}`;
    current.textContent = "0:00";
    duration.textContent = "0:00";
    seek.value = "0";
    seek.disabled = true;
    playButton.disabled = true;
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "Play");
    dot.classList.remove("active");
    feedback.textContent = `Looking for ${track.file}`;
    paintSelection();
  }

  audio.addEventListener("loadedmetadata", () => {
    loaded = true;
    seek.disabled = false;
    playButton.disabled = false;
    duration.textContent = formatTime(audio.duration);
    feedback.textContent = "Select a track or press play. Playback begins only after your click.";
  });

  audio.addEventListener("error", () => {
    loaded = false;
    seek.disabled = true;
    playButton.disabled = true;
    duration.textContent = "0:00";
    feedback.textContent = `Audio file not found yet. Add: ${CONFIG.tracks[index].file}`;
    dot.classList.remove("active");
  });

  audio.addEventListener("timeupdate", () => {
    current.textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      seek.value = String(audio.currentTime / audio.duration * 100);
    }
  });

  audio.addEventListener("play", () => {
    playButton.textContent = "Ⅱ";
    playButton.setAttribute("aria-label", "Pause");
    dot.classList.add("active");
  });

  audio.addEventListener("pause", () => {
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "Play");
    dot.classList.remove("active");
  });

  audio.addEventListener("ended", () => {
    if (!audio.loop) loadTrack(index + 1);
  });

  playButton.addEventListener("click", async () => {
    if (!loaded) return;
    if (audio.paused) {
      try {
        await audio.play();
        feedback.textContent = audio.loop ? "Playing · Repeat enabled" : "Playing from the NKT sound archive";
      } catch {
        feedback.textContent = "The browser could not start playback. Press play again.";
      }
    } else {
      audio.pause();
      feedback.textContent = "Playback paused.";
    }
  });

  selectList.addEventListener("click", event => {
    const button = event.target.closest("[data-track]");
    if (!button) return;
    loadTrack(Number(button.dataset.track));
  });

  document.getElementById("previous-track").addEventListener("click", () => loadTrack(index - 1));
  document.getElementById("next-track").addEventListener("click", () => loadTrack(index + 1));

  repeatButton.addEventListener("click", () => {
    audio.loop = !audio.loop;
    repeatButton.setAttribute("aria-pressed", String(audio.loop));
    feedback.textContent = audio.loop ? "Repeat is enabled for this track." : "Repeat is turned off.";
  });

  seek.addEventListener("input", () => {
    if (loaded && Number.isFinite(audio.duration)) {
      audio.currentTime = Number(seek.value) / 100 * audio.duration;
    }
  });

  loadTrack(0);
}
