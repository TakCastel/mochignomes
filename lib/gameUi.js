// Données d'affichage communes à l'interface
export const STATS = [
  { key: "hunger", label: "Faim", icon: "fluent-emoji-flat:bread", color: "#ff9f1c" },
  { key: "cleanliness", label: "Propreté", icon: "fluent-emoji-flat:bubbles", color: "#3fb0f5" },
  { key: "fun", label: "Amusement", icon: "fluent-emoji-flat:soccer-ball", color: "#32c766" },
  { key: "energy", label: "Énergie", icon: "fluent-emoji-flat:high-voltage", color: "#a56cff" },
  { key: "health", label: "Santé", icon: "fluent-emoji-flat:red-heart", color: "#ff5a6e" },
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
