// lib/wishes.js : envies de la créature
import { ACTION_UNLOCK_LEVEL } from "~/lib/growth";

export const WISH_POOL = [
  { id: "faim", action: "nourrir", text: "J'ai un petit creux...", icon: "solar:donut-bitten-bold-duotone", ok: (s) => s.hunger < 85, weight: (s) => 1 + (100 - s.hunger) / 40 },
  { id: "bain", action: "laver", text: "Je voudrais un bain !", icon: "solar:waterdrop-bold-duotone", ok: (s) => s.cleanliness < 85, weight: (s) => 1 + (100 - s.cleanliness) / 40 },
  { id: "jeu", action: "jouer", text: "On joue ensemble ?", icon: "solar:football-bold-duotone", ok: (s) => s.fun < 88 && s.energy >= 15, weight: (s) => 1 + (100 - s.fun) / 40 },
  { id: "calin", action: "calin", text: "Un câlin, s'il te plaît ?", icon: "solar:heart-bold-duotone", ok: () => true, weight: () => 1.2 },
  { id: "chatouille", action: "chatouiller", text: "Chatouille-moi !", icon: "solar:hand-stars-bold-duotone", ok: () => true, weight: () => 0.8 },
  { id: "danse", action: "danser", text: "J'ai envie de danser !", icon: "solar:music-notes-bold-duotone", ok: (s) => s.level >= ACTION_UNLOCK_LEVEL.danser && s.fun < 88 && s.energy >= 20, weight: () => 1 },
  { id: "dodo", action: "coucher", text: "Je commence à avoir sommeil...", icon: "solar:moon-sleep-bold-duotone", ok: (s) => s.energy < 40, weight: (s) => 1 + (60 - s.energy) / 20 },
];

// Choisit une envie réalisable maintenant (pondérée par les besoins)
export function pickWish(store, now = Date.now()) {
  const s = {
    hunger: store.hunger, cleanliness: store.cleanliness, fun: store.fun,
    energy: store.energy, level: store.level,
  };
  const early = store.hatchedAt && now - store.hatchedAt < 15 * 60000;
  const options = WISH_POOL.filter((w) => w.ok(s) && w.id !== store.wish?.id && w.id !== store.lastWishId);
  const pool = options.length ? options : WISH_POOL.filter((w) => w.id === "calin");
  const total = pool.reduce((a, w) => a + w.weight(s), 0);
  let r = Math.random() * total;
  let chosen = pool[0];
  for (const w of pool) { r -= w.weight(s); if (r <= 0) { chosen = w; break; } }
  const life = early ? 90000 : 10 * 60000;
  return { id: chosen.id, action: chosen.action, text: chosen.text, icon: chosen.icon, at: now, expiresAt: now + life };
}
