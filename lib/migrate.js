// lib/migrate.js : migration des anciennes sauvegardes vers le schéma 2.
// Reçoit un instantané simple de l'état, renvoie les champs à corriger.
export const SCHEMA = 2;
const clamp = (v, max = 100) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));

export function migrateSnapshot(s) {
  if ((s.schema || 0) >= SCHEMA) return null;
  const patch = {
    schema: SCHEMA,
    hunger: clamp(s.hunger), cleanliness: clamp(s.cleanliness), fun: clamp(s.fun),
    energy: clamp(s.energy), health: clamp(s.health),
  };
  if (s.lastUpdate) {
    // partie existante : déjà éclose, tutoriel inutile
    patch.hatched = true;
    patch.onboardStep = 6;
    patch.hatchedAt = s.bornAt || s.lastUpdate;
    patch.stage = "bebe"; // recalculé ensuite par le store
    if (patch.health <= 0) patch.health = 25; // plus de mort : on repart doucement
    patch.exhausted = false;
    patch.totalDays = Math.max(s.totalDays || 0, s.streak || 0, 1);
    patch.bestStreak = Math.max(s.bestStreak || 0, s.streak || 0);
  }
  return patch;
}
