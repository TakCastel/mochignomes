// lib/growth.js : stades de croissance, pages et actions débloquées
export const STAGES = [
  { key: "oeuf", label: "Œuf", level: 0, days: 0 },
  { key: "bebe", label: "Bébé", level: 1, days: 0 },
  { key: "enfant", label: "Enfant", level: 3, days: 1 },
  { key: "ado", label: "Ado", level: 6, days: 4 },
  { key: "adulte", label: "Adulte", level: 10, days: 10 },
];

export const STAGE_ORDER = STAGES.map((s) => s.key);

// Pages débloquées par niveau (Maison et Elle sont toujours là)
export const PAGE_UNLOCK_LEVEL = { jours: 2, album: 3 };
// Actions débloquées par niveau
export const ACTION_UNLOCK_LEVEL = { danser: 3 };

export function stageDef(key) {
  return STAGES.find((s) => s.key === key) || STAGES[1];
}

// Stade atteint pour un niveau et un âge (en jours) donnés, une fois éclose
export function stageFor(level, days) {
  let key = "bebe";
  for (const s of STAGES) {
    if (s.key === "oeuf") continue;
    if (level >= s.level && days >= s.days) key = s.key;
  }
  return key;
}

export function nextStage(key) {
  const i = STAGE_ORDER.indexOf(key);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

// Nouveautés débloquées une à une (store principal : features / unlockFeature).
// Ordre voulu : ballon (min 3-5) → pièces (1er foot) → sac + t-shirt offert (min 5-10)
// → boutique + cuisine avec le kit crêpes (niveau 2) → télé + défis (fin du jour 1)
// → collection + épicerie complète (jour 2) → course + Étoiles (jour 3).
// level : niveau qui suffit à débloquer (rattrapage, anciennes parties).
export const FEATURES = {
  ballon: { label: "Ballon", level: 2, icon: "ph:soccer-ball-fill" },
  coins: { label: "Pièces", level: 2, icon: "solar:dollar-minimalistic-bold-duotone" },
  sac: { label: "Sac", level: 2, icon: "solar:bag-4-bold-duotone" },
  boutique: { label: "Boutique", level: 2, icon: "solar:shop-bold-duotone" },
  cuisine: { label: "Cuisine", level: 2, icon: "solar:chef-hat-bold-duotone" },
  tele: { label: "Télé", level: 3, icon: "solar:tv-bold-duotone" },
  defis: { label: "Défis du jour", level: 3, icon: "solar:cup-star-bold-duotone" },
  collection: { label: "Collection", level: 4, icon: "solar:album-bold-duotone" },
  course: { label: "Course", level: 5, icon: "solar:running-bold-duotone" },
  etoiles: { label: "Étoiles", level: 5, icon: "solar:star-bold-duotone" },
};
export const FEATURE_KEYS = Object.keys(FEATURES);
