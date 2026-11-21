// lib/palettes.js
// Couleurs du décor 3D (herbe, arbres, collines, ciel) et de la lumière posée sur la scène.
// Il n'en reste qu'une : le choix du décor a été retiré des Réglages (le décor est voué à disparaître).
// Une sauvegarde qui pointe vers une ancienne palette retombe sur DEFAULT_PALETTE (app.vue).

export const PALETTES = {
  printemps: {
    label: "Printemps",
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
};

export const DEFAULT_PALETTE = "printemps";

// Thèmes d'interface : les couleurs vivent dans assets/css/themes.css (posées sur
// <html data-theme>) ; ici, le nom et l'aperçu de la tuile dans les Réglages.
// chip : [fond, plaque, accent] dessinés dans la pastille.
export const THEMES = {
  blanc: { label: "Blanc", chip: ["#ffffff", "#dfe7f1", "#2f95e8"], bar: "#8fd3ff" },
  sombre: { label: "Sombre", chip: ["#1a1f2a", "#313949", "#4ea6ee"], dark: true, bar: "#1a1f2a" },
  contraste: { label: "Contrasté", chip: ["#ffffff", "#000000", "#0050c8"], bar: "#ffffff" },
  creme: { label: "Beige", chip: ["#f8f0e1", "#e0d0b2", "#c97a2c"], bar: "#efe4cf" },
};
export const DEFAULT_THEME = "blanc";
export const themeKey = (key) => (THEMES[key] ? key : DEFAULT_THEME);
