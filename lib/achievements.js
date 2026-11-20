// lib/achievements.js
// Succès à débloquer. `progress(s)` renvoie [valeur actuelle, objectif].
import { levelInfo } from "~/stores/useTamagotchiStore";

const c = (s, key) => s.counters?.[key] || 0;
const days = (s) => (s.bornAt ? Math.floor((Date.now() - s.bornAt) / 86400000) : 0);

export const ACHIEVEMENTS = [
  { id: "premier-repas", label: "Premier repas", desc: "La nourrir une première fois", icon: "fluent-emoji-flat:bread", progress: (s) => [c(s, "nourrir"), 1] },
  { id: "gourmet", label: "Grand chef", desc: "La nourrir 50 fois", icon: "fluent-emoji-flat:birthday-cake", progress: (s) => [c(s, "nourrir"), 50] },
  { id: "propre", label: "Toujours propre", desc: "Lui donner 30 bains", icon: "fluent-emoji-flat:bathtub", progress: (s) => [c(s, "laver"), 30] },
  { id: "joueur", label: "Compagnon de jeu", desc: "Jouer 40 fois avec elle", icon: "fluent-emoji-flat:soccer-ball", progress: (s) => [c(s, "jouer"), 40] },
  { id: "danse", label: "Piste de danse", desc: "Danser 20 fois", icon: "fluent-emoji-flat:musical-notes", progress: (s) => [c(s, "danser"), 20] },
  { id: "calins", label: "Cœur tendre", desc: "Lui faire 100 câlins ou chatouilles", icon: "fluent-emoji-flat:two-hearts", progress: (s) => [c(s, "calin") + c(s, "chatouiller"), 100] },
  { id: "docteur", label: "Docteur", desc: "La soigner 15 fois", icon: "fluent-emoji-flat:syringe", progress: (s) => [c(s, "soigner"), 15] },
  { id: "photographe", label: "Photographe", desc: "Prendre 5 photos", icon: "fluent-emoji-flat:camera-with-flash", progress: (s) => [c(s, "photo"), 5] },
  { id: "niveau-5", label: "Bien grandie", desc: "Atteindre le niveau 5", icon: "fluent-emoji-flat:glowing-star", progress: (s) => [levelInfo(s.xp || 0).level, 5] },
  { id: "niveau-10", label: "Légende", desc: "Atteindre le niveau 10", icon: "fluent-emoji-flat:crown", progress: (s) => [levelInfo(s.xp || 0).level, 10] },
  { id: "semaine", label: "Une semaine ensemble", desc: "S'en occuper 7 jours", icon: "fluent-emoji-flat:spiral-calendar", progress: (s) => [days(s), 7] },
  { id: "phenix", label: "Phénix", desc: "La ramener à la vie", icon: "fluent-emoji-flat:sparkles", progress: (s) => [c(s, "revive"), 1] },
];

export function ageInDays(s) {
  return days(s);
}
