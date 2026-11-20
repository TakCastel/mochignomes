// lib/palettes.js
// Palettes de couleurs de l'interface. Chacune règle les boutons, les jauges,
// les panneaux, le ciel et la lumière posée sur la scène.
// jelly : [couleur, tranche foncée] de chaque bouton ; stats : couleur de chaque jauge.

export const PALETTES = {
  bonbon: {
    label: "Bonbon",
    jelly: { nourrir: ["#ff8a3d", "#d24f12"], laver: ["#36a8ff", "#1765c9"], jouer: ["#3fd37a", "#178a45"], coucher: ["#7b5cff", "#4630c9"], calin: ["#ff4f91", "#c41d5d"], soigner: ["#22c7b8", "#0e8a80"] },
    stats: { hunger: "#ff7a2e", cleanliness: "#2f9bff", fun: "#2fc46a", energy: "#7b5cff", health: "#ff4f91" },
    tiles: ["#ff7a2e", "#7b5cff", "#22c7b8", "#ff4f91"],
    panel: ["#ffffff", "#ffe9f3"], knob: ["#ffffff", "#ffe2ef", "#f2a9c8"], ink: "#4a2160",
    sky: { top: "#2a7bff", bottom: "#a9e2ff" }, glow: "rgba(255, 150, 200, 0.22)", edge: "rgba(90, 30, 120, 0.25)",
  },
  sorbet: {
    label: "Sorbet",
    jelly: { nourrir: ["#ffab7a", "#e0704a"], laver: ["#7fb8ff", "#4f86dc"], jouer: ["#7edcaa", "#3ea870"], coucher: ["#ae94ff", "#7a5fd8"], calin: ["#ff94bd", "#dc5c8e"], soigner: ["#6fd6c8", "#36a294"] },
    stats: { hunger: "#ff8f5a", cleanliness: "#5fa3f5", fun: "#4fc78a", energy: "#9a7bff", health: "#ff7aab" },
    tiles: ["#ff8f5a", "#9a7bff", "#36a294", "#ff7aab"],
    panel: ["#fffaf6", "#efe6ff"], knob: ["#ffffff", "#ece4ff", "#cdbdf2"], ink: "#45346b",
    sky: { top: "#7aa8ff", bottom: "#ffd6ec" }, glow: "rgba(255, 190, 220, 0.3)", edge: "rgba(110, 80, 160, 0.2)",
  },
  soleil: {
    label: "Coucher de soleil",
    jelly: { nourrir: ["#ffad2e", "#d97a00"], laver: ["#3f8cff", "#1f55c9"], jouer: ["#ffcf26", "#cf9600"], coucher: ["#8d55ff", "#5a24cf"], calin: ["#ff4778", "#c71848"], soigner: ["#ff7a45", "#cc4a18"] },
    stats: { hunger: "#ff9a1a", cleanliness: "#3f8cff", fun: "#ffc21a", energy: "#8d55ff", health: "#ff4778" },
    tiles: ["#ff9a1a", "#8d55ff", "#3f8cff", "#ff4778"],
    panel: ["#fff6ea", "#ffd6b8"], knob: ["#fffaf2", "#ffe0c6", "#f0a878"], ink: "#5c2410",
    sky: { top: "#ff6f6f", bottom: "#ffd27a" }, glow: "rgba(255, 170, 60, 0.35)", edge: "rgba(140, 40, 40, 0.28)",
  },
  lagon: {
    label: "Lagon",
    jelly: { nourrir: ["#ffb02e", "#d97a00"], laver: ["#00b2e3", "#0072a3"], jouer: ["#3ddc97", "#119c63"], coucher: ["#5465ff", "#2836c9"], calin: ["#ff5d8f", "#cc2a5c"], soigner: ["#14d0c9", "#08918d"] },
    stats: { hunger: "#ffa21a", cleanliness: "#00a8e0", fun: "#2fcf88", energy: "#5465ff", health: "#ff5d8f" },
    tiles: ["#ffa21a", "#5465ff", "#08b5b0", "#ff5d8f"],
    panel: ["#f6feff", "#d4f2f7"], knob: ["#ffffff", "#ddf3f8", "#9fd5e2"], ink: "#0f3f55",
    sky: { top: "#0091ff", bottom: "#8ff0ff" }, glow: "rgba(120, 240, 255, 0.25)", edge: "rgba(0, 60, 100, 0.25)",
  },
};

export const DEFAULT_PALETTE = "bonbon";

// Variables CSS d'une palette
export function paletteVars(key) {
  const p = PALETTES[key] || PALETTES[DEFAULT_PALETTE];
  return {
    "--panel-top": p.panel[0], "--panel-bottom": p.panel[1],
    "--knob-hi": p.knob[0], "--knob-lo": p.knob[1], "--knob-side": p.knob[2],
    "--ink": p.ink, "--glow": p.glow, "--edge": p.edge,
    "--plate-hi": p.panel[0], "--plate-lo": p.panel[1],
  };
}
