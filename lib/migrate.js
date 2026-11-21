// lib/migrate.js : migration des anciennes sauvegardes vers le schéma courant.
// Reçoit un instantané simple de l'état, renvoie les champs à corriger (ou null).
//   schéma 2 : éclosion, tutoriel, stades
//   schéma 3 : monnaies, inventaire, activités, cuisine (le Sac a son propre store ;
//              ici on garde tout et on prévoit un cadeau de bienvenue pour les parties existantes)
//   schéma 4 : réorientation — goûts (graine figée), nouveautés débloquées une à une
//              (les parties existantes reçoivent en silence tout ce que leur progression a atteint),
//              3 défis par jour
//   schéma 5 : rythme des nouveautés — plus aucun déblocage en masse : les parties existantes
//              découvrent ballon, Sac, Boutique... une à une, espacées par le jeu et les visites.
//              Les sauvegardes de schéma 4 qui avaient tout reçu d'un coup en silence repartent
//              de zéro côté nouveautés (l'inventaire est conservé).
//   schéma 6 : apparence aléatoire tirée à l'éclosion (lib/appearance.js). Les créatures déjà
//              écloses gardent leur look d'origine (orange, ronde, feuille, sans oreilles) :
//              jamais de nouveau tirage pour elles.
export const SCHEMA = 6;
const clamp = (v, max = 100) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));

function toSchema2(s) {
  const patch = {
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

// Nouveautés toutes reçues à la même seconde : l'ancien rattrapage silencieux du schéma 4
function batchUnlocked(features) {
  const t = Object.values(features || {}).filter(Number.isFinite);
  return t.length >= 4 && Math.max(...t) - Math.min(...t) < 5000;
}

export function migrateSnapshot(s) {
  const from = s.schema || 0;
  if (from >= SCHEMA) return null;
  let patch = {};
  if (from < 2) patch = toSchema2(s);
  if (from < 3) {
    // partie déjà commencée (éclose) : cadeau de bienvenue en pièces, selon l'ancienneté
    const started = patch.hatched ?? s.hatched;
    if (started && s.lastUpdate) patch.welcomeCoins = 60 + Math.min(140, (s.totalDays || 1) * 10);
  }
  if (from < 4) {
    patch.upgradeQuests = true; // les défis du jour passent au nouveau format (3 défis + bonus)
    patch.seedTastes = true; // graine des goûts figée (hatchedAt + nom)
  }
  if (from === 4 && batchUnlocked(s.features)) patch.relockFeatures = true;
  if (from < 6) patch.keepAppearance = true; // le store fige le look d'origine si elle est déjà éclose
  patch.schema = SCHEMA;
  return patch;
}
