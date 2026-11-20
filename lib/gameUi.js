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
