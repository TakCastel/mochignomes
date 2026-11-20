// lib/palettes.js
// Palettes de couleurs : chacune règle tout l'écran — le décor 3D (herbe, arbres,
// collines, ciel), la lumière posée sur la scène, les panneaux et les boutons.
// jelly : [couleur, tranche foncée] de chaque bouton ; stats : couleur de chaque jauge.

export const PALETTES = {
  printemps: {
    label: "Printemps doré",
    world: {
      grass: ["#62c43c", "#3f9e2c"], far: "#e3ec8f", path: "#f4d08f", pathEdge: "#dcaa66",
      leaves: ["#52bb3a", "#2f993d", "#97d23c"], pine: "#2b8a4e", bush: "#47b33f", tuft: "#3a9a2e",
      hills: ["#b2db7d", "#c4e19a", "#d8e9c0"],
    },
    sky: { top: "#2f86ff", bottom: "#d4f0ff" },
    glow: "rgba(255, 205, 90, 0.38)", edge: "rgba(110, 60, 10, 0.26)",
    panel: ["#fff6e6", "#f7d9a8"], knob: ["#fffbf2", "#f6e1bd", "#d9ac6c"], ink: "#5a3816",
    jelly: { nourrir: ["#ff9a1f", "#d35c00"], laver: ["#3592ff", "#1655cc"], jouer: ["#56c92a", "#2a860f"], coucher: ["#8a55f2", "#5320c4"], calin: ["#ff4f8a", "#c71b58"], soigner: ["#19c4b4", "#078a80"] },
    stats: { hunger: "#ff8a12", cleanliness: "#2f8cff", fun: "#45bf22", energy: "#8a55f2", health: "#ff4f8a" },
    tiles: ["#e8780e", "#8a55f2", "#0fa99b", "#ff4f8a"],
  },
  bonbon: {
    label: "Bonbon",
    world: {
      grass: ["#86e0bd", "#55c6a0"], far: "#ffd6ee", path: "#fff0f7", pathEdge: "#ffc0dc",
      leaves: ["#ff9fc9", "#c7a2ff", "#ffb79e"], pine: "#9a86ff", bush: "#ff92c2", tuft: "#5fc9a6",
      hills: ["#cdbcff", "#ffc8e6", "#ffe4f2"],
    },
    sky: { top: "#8fb4ff", bottom: "#ffdcf1" },
    glow: "rgba(255, 170, 220, 0.35)", edge: "rgba(120, 40, 120, 0.22)",
    panel: ["#fff3fa", "#ffd2e8"], knob: ["#fff8fc", "#ffdcec", "#f39cc6"], ink: "#5c1f4f",
    jelly: { nourrir: ["#ffa06b", "#e0612e"], laver: ["#6aa8ff", "#3a6fe0"], jouer: ["#4fd3a0", "#1d9a6b"], coucher: ["#a07bff", "#6a42e0"], calin: ["#ff6fae", "#d1347a"], soigner: ["#45cfd6", "#1693a0"] },
    stats: { hunger: "#ff8a52", cleanliness: "#5b9bff", fun: "#2fc48c", energy: "#9a72ff", health: "#ff5fa6" },
    tiles: ["#ff8a52", "#9a72ff", "#1fa9b3", "#ff5fa6"],
  },
  automne: {
    label: "Automne",
    world: {
      grass: ["#b3b844", "#8b9a33"], far: "#f6c47a", path: "#ecb57c", pathEdge: "#c98b52",
      leaves: ["#ff8a2b", "#e3462c", "#ffc23a"], pine: "#3e6b3a", bush: "#dc642c", tuft: "#9a9a35",
      hills: ["#e9a865", "#dc8c6b", "#c98a9e"],
    },
    sky: { top: "#ff7466", bottom: "#ffd88a" },
    glow: "rgba(255, 160, 50, 0.42)", edge: "rgba(120, 30, 20, 0.3)",
    panel: ["#fff2e4", "#ffc99c"], knob: ["#fff9f1", "#ffe0c4", "#e8955c"], ink: "#5c2410",
    jelly: { nourrir: ["#ffae22", "#d47800"], laver: ["#3b7cf2", "#1d4bc0"], jouer: ["#ffcb1f", "#cc9200"], coucher: ["#7c4ae0", "#4a1fb0"], calin: ["#f03e6e", "#b8133f"], soigner: ["#ff6f3c", "#c94210"] },
    stats: { hunger: "#ff9a12", cleanliness: "#3b7cf2", fun: "#f2b400", energy: "#7c4ae0", health: "#f03e6e" },
    tiles: ["#e67e00", "#7c4ae0", "#3b7cf2", "#f03e6e"],
  },
  lagon: {
    label: "Lagon",
    world: {
      grass: ["#7fdf55", "#3dbd4c"], far: "#c2f6dd", path: "#fff1c4", pathEdge: "#f0d38a",
      leaves: ["#17c79b", "#0aa58e", "#5ee07b"], pine: "#0c8a7b", bush: "#22c9a1", tuft: "#2fb563",
      hills: ["#80d9c5", "#a1e7d8", "#c6f3eb"],
    },
    sky: { top: "#008dff", bottom: "#9af2ff" },
    glow: "rgba(130, 245, 255, 0.3)", edge: "rgba(0, 60, 90, 0.26)",
    panel: ["#f2fffe", "#c2eef1"], knob: ["#f7ffff", "#d0f3f4", "#7cc8cf"], ink: "#0d3d52",
    jelly: { nourrir: ["#ffad2b", "#d97500"], laver: ["#00a9e6", "#006aa3"], jouer: ["#38d68c", "#109a5a"], coucher: ["#4f5ff5", "#2532c4"], calin: ["#ff5b8c", "#cc2759"], soigner: ["#12cbc3", "#068f8a"] },
    stats: { hunger: "#ff9d1a", cleanliness: "#00a2e0", fun: "#2ccb80", energy: "#4f5ff5", health: "#ff5b8c" },
    tiles: ["#f08c00", "#4f5ff5", "#07a9a3", "#ff5b8c"],
  },
};

export const DEFAULT_PALETTE = "printemps";

// Variables CSS d'une palette
export function paletteVars(key, uiKey) {
  const p = PALETTES[key] || PALETTES[DEFAULT_PALETTE];
  const u = UI_THEMES[uiKey] || p;
  return {
    "--panel-top": u.panel[0], "--panel-bottom": u.panel[1],
    "--knob-hi": u.knob[0], "--knob-lo": u.knob[1], "--knob-side": u.knob[2],
    "--ink": u.ink, "--glow": p.glow, "--edge": p.edge,
    "--plate-hi": u.panel[0], "--plate-lo": u.panel[1],
  };
}

// Thèmes d'interface (boutons, panneaux, jauges, tuiles, texte), indépendants du décor.
// jelly : [couleur du bouton, tranche foncée, couleur de l'icône (blanc par défaut)]
export const UI_THEMES = {
  pastel: {
    label: "Pastel",
    jelly: { nourrir: ["#ffab85", "#df6f48"], laver: ["#8fa3ff", "#5a6de0"], jouer: ["#7dd1a0", "#3e9d68"], coucher: ["#b38dff", "#7a54e0"], calin: ["#ff8fb8", "#d8558a"], soigner: ["#6dd2df", "#2f9db0"] },
    stats: { hunger: "#ff8f62", cleanliness: "#6f87ff", fun: "#4fbf86", energy: "#9f78ff", health: "#ff6fa5" },
    tiles: ["#ff8f62", "#9f78ff", "#2f9db0", "#ff6fa5"],
    panel: ["#ffffff", "#f1ecff"], knob: ["#ffffff", "#ede7ff", "#cbbdf2"], ink: "#45366b",
  },
  nuit: {
    label: "Nuit étoilée",
    dark: true,
    jelly: { nourrir: ["#ffb627", "#c97500"], laver: ["#22b8ff", "#006fbd"], jouer: ["#78e046", "#33930f"], coucher: ["#9a6bff", "#5a2dd6"], calin: ["#ff4f9f", "#c2166c"], soigner: ["#2be3c3", "#08977f"] },
    stats: { hunger: "#ffb627", cleanliness: "#22b8ff", fun: "#78e046", energy: "#9a6bff", health: "#ff4f9f" },
    tiles: ["#ffb627", "#9a6bff", "#2be3c3", "#ff4f9f"],
    panel: ["rgba(44, 38, 104, 0.94)", "rgba(28, 24, 74, 0.96)"], knob: ["#4a44a8", "#2f2b7c", "#191650"], ink: "#ffffff",
  },
  corail: {
    label: "Corail",
    jelly: { nourrir: ["#ff6b5b", "#c9372a"], laver: ["#1fb4a8", "#0a7b72"], jouer: ["#ffc93c", "#d69500"], coucher: ["#3f5cff", "#1e34b8"], calin: ["#ff7aa3", "#cf446e"], soigner: ["#3dcfc3", "#14958b"] },
    stats: { hunger: "#ff6b5b", cleanliness: "#1fb4a8", fun: "#f2b400", energy: "#3f5cff", health: "#ff7aa3" },
    tiles: ["#ff6b5b", "#3f5cff", "#1fb4a8", "#ff7aa3"],
    panel: ["#fffaf4", "#ffe6d5"], knob: ["#fffdf9", "#ffe7d4", "#f2ad8c"], ink: "#3d1f2b",
  },
  verre: {
    label: "Verre",
    jelly: { nourrir: ["#ffffff", "#cfd6e6", "#ff8a1f"], laver: ["#ffffff", "#cfd6e6", "#2f86ff"], jouer: ["#ffffff", "#cfd6e6", "#36b83c"], coucher: ["#ffffff", "#cfd6e6", "#7d4dff"], calin: ["#ffffff", "#cfd6e6", "#ff3f86"], soigner: ["#ffffff", "#cfd6e6", "#0fb3a6"] },
    stats: { hunger: "#ff8a1f", cleanliness: "#2f86ff", fun: "#36b83c", energy: "#7d4dff", health: "#ff3f86" },
    tiles: ["#ff8a1f", "#7d4dff", "#0fb3a6", "#ff3f86"],
    panel: ["rgba(255, 255, 255, 0.82)", "rgba(240, 244, 252, 0.82)"], knob: ["#ffffff", "#eef1f8", "#c6cde0"], ink: "#27304f",
  },
};
export const DEFAULT_UI = "pastel";
export const uiTheme = (key) => UI_THEMES[key] || UI_THEMES[DEFAULT_UI];
