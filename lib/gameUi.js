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
  lavande: { label: "Lavande", hi: "#e6dbff", mid: "#b39cff", lo: "#8466f0", edge: "#5f40cf", plateHi: "#fbf9ff", plateLo: "#e9e1ff", shade: "rgba(70, 40, 160, 0.38)", knobLo: "#e4daff", knobSide: "#a993f5", ink: "#3a2370", wall1: "#6a45ff", wall2: "#ff6fb8" },
  peche: { label: "Pêche", hi: "#ffe6d8", mid: "#ffb593", lo: "#f4865c", edge: "#d45f36", plateHi: "#fffaf6", plateLo: "#ffe4d6", shade: "rgba(170, 70, 30, 0.36)", knobLo: "#ffdfcf", knobSide: "#f2a585", ink: "#6b2a14", wall1: "#ff7a50", wall2: "#ffc83d" },
  menthe: { label: "Menthe", hi: "#dcfbec", mid: "#8fe3bd", lo: "#4fc496", edge: "#2a9d70", plateHi: "#f6fffa", plateLo: "#d9f5e8", shade: "rgba(20, 110, 70, 0.36)", knobLo: "#d3f2e3", knobSide: "#86d4b0", ink: "#164d36", wall1: "#14b88f", wall2: "#5fd0ff" },
  ciel: { label: "Ciel", hi: "#ddeeff", mid: "#9fcbff", lo: "#629ff0", edge: "#3b78d4", plateHi: "#f7fbff", plateLo: "#dcebff", shade: "rgba(30, 80, 170, 0.36)", knobLo: "#d6e8ff", knobSide: "#93bcf0", ink: "#173a72", wall1: "#3f5dff", wall2: "#5fe3ff" },
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
