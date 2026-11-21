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
