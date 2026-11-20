// Données d'affichage communes à l'interface
export const STATS = [
  { key: "hunger", label: "Faim", icon: "ph:bowl-food-fill", color: "#ff8a00" },
  { key: "cleanliness", label: "Propreté", icon: "ph:drop-fill", color: "#1f9bff" },
  { key: "fun", label: "Amusement", icon: "ph:soccer-ball-fill", color: "#18c247" },
  { key: "energy", label: "Énergie", icon: "ph:lightning-fill", color: "#9a4dff" },
  { key: "health", label: "Santé", icon: "ph:heart-fill", color: "#ff3d63" },
];

export const TRAIT_INFO = {
  joueuse: { label: "Joueuse", color: "#22c55e", hint: "quand tu joues souvent avec elle." },
  caline: { label: "Câline", color: "#ee4d6a", hint: "quand tu la chatouilles (touche-la)." },
  gourmande: { label: "Gourmande", color: "#f59e0b", hint: "quand tu la nourris alors qu'elle n'a plus faim. Elle prend du ventre plus vite." },
  coquette: { label: "Coquette", color: "#3b82f6", hint: "quand tu la laves alors qu'elle est déjà propre. Elle se trouve sale plus tôt." },
  rancuniere: { label: "Rancunière", color: "#8b5cf6", hint: "quand tu la laisses manquer de quelque chose. Elle boude ensuite un moment ; jouer avec elle l'apaise." },
};

// Moment de la journée d'après l'heure réelle
export function dayPhase(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6 && h < 9) return "dawn";
  if (h >= 9 && h < 18) return "day";
  if (h >= 18 && h < 21) return "dusk";
  return "night";
}

// Couleurs du ciel par moment de la journée (le brouillard 3D au loin reprend « bottom »)
export const SKY = {
  dawn: { top: "#ff8a7a", bottom: "#ffd9a6" },
  day: { top: "#2f9dff", bottom: "#b9e9ff" },
  dusk: { top: "#4f3fc4", bottom: "#ff9a72" },
  night: { top: "#0b1238", bottom: "#27317a" },
};

// Couleurs de coque au choix (comme les vrais jouets en plastique de couleur).
// hi/mid/lo : corps de la coque ; edge : liseré ; plate : plaques intérieures ;
// knob : bord des boutons ; ink : texte ; wall : fond derrière la console.
export const SHELLS = {
  lavande: { label: "Lavande", hi: "#f6f1ff", mid: "#d9ccff", lo: "#ad97f3", edge: "#8a6fe3", plateHi: "#fcfbff", plateLo: "#ece5ff", shade: "rgba(90, 60, 170, 0.32)", knobLo: "#e7defe", knobSide: "#bca9f3", ink: "#3f2a78", wall1: "#7b5cff", wall2: "#ff86c8" },
  peche: { label: "Pêche", hi: "#fff4ec", mid: "#ffd4bf", lo: "#f4a786", edge: "#df7e5b", plateHi: "#fffaf6", plateLo: "#ffe7dc", shade: "rgba(170, 80, 40, 0.3)", knobLo: "#ffe3d5", knobSide: "#f1b69b", ink: "#6b2f1a", wall1: "#ff8a65", wall2: "#ffd25c" },
  menthe: { label: "Menthe", hi: "#effff7", mid: "#c3f1da", lo: "#8ed8b4", edge: "#5bbd8f", plateHi: "#f8fffb", plateLo: "#def7eb", shade: "rgba(30, 120, 80, 0.3)", knobLo: "#d8f4e6", knobSide: "#9ddbbc", ink: "#1d5a40", wall1: "#21bf98", wall2: "#7ad7ff" },
  ciel: { label: "Ciel", hi: "#f0f8ff", mid: "#c9e4ff", lo: "#95c5f4", edge: "#679fe2", plateHi: "#f8fcff", plateLo: "#e2f0ff", shade: "rgba(40, 90, 170, 0.3)", knobLo: "#dbecff", knobSide: "#a6caf1", ink: "#1f3f75", wall1: "#4f6dff", wall2: "#6fe8ff" },
  creme: { label: "Crème", hi: "#fffbf4", mid: "#f5e9d8", lo: "#e2cbac", edge: "#c9a77f", plateHi: "#fffdf9", plateLo: "#efe2d1", shade: "rgba(140, 110, 80, 0.35)", knobLo: "#eadbc6", knobSide: "#d6c3a9", ink: "#5a3a24", wall1: "#ffb347", wall2: "#ff7aa8" },
};

// Variables CSS d'un thème de coque
export function shellVars(key) {
  const t = SHELLS[key] || SHELLS.lavande;
  return {
    "--shell-hi": t.hi, "--shell": t.mid, "--shell-lo": t.lo, "--shell-edge": t.edge,
    "--plate-hi": t.plateHi, "--plate-lo": t.plateLo, "--plate-shade": t.shade,
    "--knob-lo": t.knobLo, "--knob-side": t.knobSide, "--ink": t.ink,
    "--wall-1": t.wall1, "--wall-2": t.wall2,
  };
}
