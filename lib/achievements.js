// lib/achievements.js
// Succès à débloquer. `progress(s)` renvoie [valeur actuelle, objectif].
import { levelInfo } from "~/stores/useTamagotchiStore";

const c = (s, key) => s.counters?.[key] || 0;
const days = (s) => (s.bornAt ? Math.floor((Date.now() - s.bornAt) / 86400000) : 0);

export const ACHIEVEMENTS = [
  { id: "premier-repas", color: "#ff8a00", label: "Premier repas", desc: "La nourrir une première fois", icon: "ph:bowl-food-fill", progress: (s) => [c(s, "nourrir"), 1] },
  { id: "gourmet", color: "#ff8a00", label: "Grand chef", desc: "La nourrir 50 fois", icon: "ph:chef-hat-fill", progress: (s) => [c(s, "nourrir"), 50] },
  { id: "propre", color: "#1f9bff", label: "Toujours propre", desc: "Lui donner 30 bains", icon: "ph:bathtub-fill", progress: (s) => [c(s, "laver"), 30] },
  { id: "joueur", color: "#18c247", label: "Compagnon de jeu", desc: "Jouer 40 fois avec elle", icon: "ph:soccer-ball-fill", progress: (s) => [c(s, "jouer"), 40] },
  { id: "danse", color: "#9a4dff", label: "Piste de danse", desc: "Danser 20 fois", icon: "ph:music-notes-fill", progress: (s) => [c(s, "danser"), 20] },
  { id: "calins", color: "#f0479b", label: "Cœur tendre", desc: "Lui faire 100 câlins ou chatouilles", icon: "ph:hand-heart-fill", progress: (s) => [c(s, "calin") + c(s, "chatouiller"), 100] },
  { id: "docteur", color: "#14c6e0", label: "Docteur", desc: "La soigner 15 fois", icon: "ph:syringe-fill", progress: (s) => [c(s, "soigner"), 15] },
  { id: "photographe", color: "#ff7a2e", label: "Photographe", desc: "Prendre 5 photos", icon: "ph:camera-fill", progress: (s) => [c(s, "photo"), 5] },
  { id: "niveau-5", color: "#ffb300", label: "Bien grandie", desc: "Atteindre le niveau 5", icon: "ph:star-fill", progress: (s) => [levelInfo(s.xp || 0).level, 5] },
  { id: "niveau-10", color: "#ffb300", label: "Légende", desc: "Atteindre le niveau 10", icon: "ph:crown-fill", progress: (s) => [levelInfo(s.xp || 0).level, 10] },
  { id: "semaine", color: "#21b8d6", label: "Une semaine ensemble", desc: "S'en occuper 7 jours", icon: "ph:calendar-check-fill", progress: (s) => [days(s), 7] },
  { id: "phenix", color: "#ff4d2e", label: "Phénix", desc: "La ramener à la vie", icon: "ph:fire-fill", progress: (s) => [c(s, "revive"), 1] },
];

export function ageInDays(s) {
  return days(s);
}
