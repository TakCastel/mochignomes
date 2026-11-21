// lib/achievements.js
// Succès à débloquer. `progress(s)` renvoie [valeur actuelle, objectif].
import { levelInfo } from "~/stores/useTamagotchiStore";

const c = (s, key) => s.counters?.[key] || 0;
const STAGE_IDX = { oeuf: 0, bebe: 1, enfant: 2, ado: 3, adulte: 4 };
const stageIdx = (s) => STAGE_IDX[s.stage] ?? 0;
const days = (s) => (s.bornAt ? Math.floor((Date.now() - s.bornAt) / 86400000) : 0);

export const ACHIEVEMENTS = [
  { id: "premier-repas", color: "#ff8a00", label: "Premier repas", desc: "La nourrir une première fois", icon: "solar:donut-bitten-bold-duotone", progress: (s) => [c(s, "nourrir"), 1] },
  { id: "gourmet", color: "#ff8a00", label: "Grand chef", desc: "La nourrir 50 fois", icon: "solar:chef-hat-bold-duotone", progress: (s) => [c(s, "nourrir"), 50] },
  { id: "propre", color: "#1f9bff", label: "Toujours propre", desc: "Lui donner 30 bains", icon: "solar:bath-bold-duotone", progress: (s) => [c(s, "laver"), 30] },
  { id: "joueur", color: "#18c247", label: "Compagnon de jeu", desc: "Jouer 40 fois avec elle", icon: "solar:football-bold-duotone", progress: (s) => [c(s, "jouer"), 40] },
  { id: "danse", color: "#9a4dff", label: "Piste de danse", desc: "Danser 20 fois", icon: "solar:music-notes-bold-duotone", progress: (s) => [c(s, "danser"), 20] },
  { id: "calins", color: "#f0479b", label: "Cœur tendre", desc: "Partager 100 tendresses ou fous rires", icon: "solar:hand-heart-bold-duotone", progress: (s) => [c(s, "calin") + c(s, "chatouiller"), 100] },
  { id: "docteur", color: "#14c6e0", label: "Docteur", desc: "La soigner 15 fois", icon: "solar:syringe-bold-duotone", progress: (s) => [c(s, "soigner"), 15] },
  { id: "photographe", color: "#ff7a2e", label: "Photographe", desc: "Prendre 5 photos", icon: "solar:camera-bold-duotone", progress: (s) => [c(s, "photo"), 5] },
  { id: "niveau-5", color: "#ffb300", label: "Bien grandie", desc: "Atteindre le niveau 5", icon: "solar:star-bold-duotone", progress: (s) => [levelInfo(s.xp || 0).level, 5] },
  { id: "niveau-10", color: "#ffb300", label: "Légende", desc: "Atteindre le niveau 10", icon: "solar:crown-bold-duotone", progress: (s) => [levelInfo(s.xp || 0).level, 10] },
  { id: "semaine", color: "#21b8d6", label: "Une semaine ensemble", desc: "S'en occuper 7 jours", icon: "solar:calendar-mark-bold-duotone", progress: (s) => [days(s), 7] },
  { id: "phenix", color: "#ff4d2e", label: "Phénix", desc: "La remettre sur pied quand elle était épuisée", icon: "solar:fire-bold-duotone", progress: (s) => [c(s, "revive"), 1] },
  { id: "eclosion", color: "#ffb300", label: "Bienvenue au monde", desc: "Faire éclore l'œuf", icon: "solar:stars-bold-duotone", progress: (s) => [s.hatched ? 1 : 0, 1] },
  { id: "enfant", color: "#21b8d6", label: "Elle grandit", desc: "Devenir enfant", icon: "solar:leaf-bold-duotone", progress: (s) => [stageIdx(s), 2] },
  { id: "ado", color: "#9a4dff", label: "L'âge ingrat", desc: "Devenir ado", icon: "solar:sparkles-bold-duotone", progress: (s) => [stageIdx(s), 3] },
  { id: "adulte", color: "#ff4d2e", label: "Toute grande", desc: "Devenir adulte", icon: "solar:medal-ribbon-star-bold-duotone", progress: (s) => [stageIdx(s), 4] },
  { id: "premiere-envie", color: "#f0479b", label: "À l'écoute", desc: "Exaucer une première envie", icon: "solar:chat-round-dots-bold-duotone", progress: (s) => [s.wishesDone || 0, 1] },
  { id: "envies-25", color: "#f0479b", label: "Exauceur d'envies", desc: "Exaucer 25 envies", icon: "solar:gift-bold-duotone", progress: (s) => [s.wishesDone || 0, 25] },
  { id: "serie-3", color: "#ff8a00", label: "Trois jours de suite", desc: "Une série de 3 jours", icon: "solar:fire-bold-duotone", progress: (s) => [s.bestStreak || 0, 3] },
  { id: "serie-7", color: "#ff8a00", label: "Une semaine de suite", desc: "Une série de 7 jours", icon: "solar:calendar-mark-bold-duotone", progress: (s) => [s.bestStreak || 0, 7] },
  { id: "gueri", color: "#14c6e0", label: "Bon rétablissement", desc: "La guérir d'un rhume", icon: "solar:pill-bold-duotone", progress: (s) => [c(s, "guerison"), 1] },
];

export function ageInDays(s) {
  return days(s);
}
