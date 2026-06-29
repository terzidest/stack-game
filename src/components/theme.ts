// Shared visual language for the React UI (HUD + overlays). One source of truth
// so colors stop drifting between screens. The game canvas (Skia) keeps its own
// color math in render/; this is only for the React shell.

export const theme = {
  // Warm accent — the sun, achievements, primary actions. One gold everywhere.
  gold: "#ffd76e",
  onGold: "#10233f", // dark text on a gold fill

  // Text
  text: "#ffffff",
  textSoft: "#dbe6f7", // secondary copy; reads over glass on the daylight sky

  // Glass panels (translucent so the sky shows through)
  panel: "rgba(255, 255, 255, 0.12)",
  panelBorder: "rgba(255, 255, 255, 0.28)",

  // Scrims — light enough that the sky stays visible behind
  scrimSoft: "rgba(10, 24, 48, 0.38)", // start / game-over full-screen overlay
  scrimModal: "rgba(10, 24, 48, 0.5)", // pause / settings modals

  // Controls
  trackOff: "rgba(255, 255, 255, 0.18)", // switch off-track

  skyTop: "#1d3f6e", // reference (matches the canvas sky top)
} as const;
