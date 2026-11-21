// lib/growth.js : stades de croissance, pages et actions débloquées
export const STAGES = [
  { key: "oeuf", label: "Œuf", level: 0, days: 0 },
  { key: "bebe", label: "Bébé", level: 1, days: 0 },
  { key: "enfant", label: "Enfant", level: 3, days: 1 },
  { key: "ado", label: "Ado", level: 6, days: 4 },
  { key: "adulte", label: "Adulte", level: 10, days: 10 },
];

export const STAGE_ORDER = STAGES.map((s) => s.key);

// Pages débloquées par niveau (Maison et Elle sont toujours là ;
// Jours arrive avec la nouveauté « défis », voir store.unlockedPages)
export const PAGE_UNLOCK_LEVEL = { album: 3 };
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
// Ordre voulu : ballon (dès la fin du tutoriel) → pièces (1er foot) → sac + t-shirt offert
// → boutique (Sac ouvert) → cuisine avec le kit crêpes (Boutique visitée) → télé (1res crêpes)
// → défis (1er épisode) → collection + épicerie complète → course → Étoiles.
// level : niveau qui suffit à débloquer (rattrapage, anciennes parties).
// Rythme (store.checkUnlocks) : une seule nouveauté à la fois, la suivante attend que sa carte soit vue.
//   chain   : première visite, déblocage en chaîne : chaque nouveauté arrive dès qu'on a essayé la
//             précédente (pas d'attente), ou au bout de CHAIN_IDLE_MIN minutes de jeu si on l'ignore.
//   gap     : minutes de jeu ACTIF (appli ouverte) depuis la nouveauté précédente ;
//             une nouvelle session (retour après 20 min) vaut aussi une pause, après 30 s de jeu.
//   session : true → il faut en plus une NOUVELLE session depuis la nouveauté précédente
//             (une seule grosse nouveauté par visite, une fois les bases posées).
// Les anciennes parties suivent la même chaîne : leurs conditions de niveau sont
// déjà remplies, c'est ce rythme qui les espace.
export const CHAIN_IDLE_MIN = 3;
export const FEATURES = {
  // première visite : en chaîne, menu après menu
  ballon: { label: "Ballon", level: 2, icon: "ph:soccer-ball-fill", gap: 0, chain: true },
  coins: { label: "Pièces", level: 2, icon: "mochi:coin", gap: 0, chain: true },
  sac: { label: "Sac", level: 2, icon: "solar:bag-4-bold-duotone", gap: 0, chain: true },
  boutique: { label: "Boutique", level: 2, icon: "solar:shop-bold-duotone", gap: 0, chain: true },
  cuisine: { label: "Cuisine", level: 2, icon: "solar:chef-hat-bold-duotone", gap: 0, chain: true },
  tele: { label: "Télé", level: 3, icon: "solar:tv-bold-duotone", gap: 0, chain: true },
  defis: { label: "Défis du jour", level: 3, icon: "solar:cup-star-bold-duotone", gap: 0, chain: true },
  // ensuite : au fil des visites et des jours
  collection: { label: "Collection", level: 4, icon: "solar:album-bold-duotone", gap: 10, session: true },
  course: { label: "Course", level: 5, icon: "solar:running-bold-duotone", gap: 10, session: true },
  etoiles: { label: "Étoiles", level: 5, icon: "solar:star-bold-duotone", gap: 10, session: true },
};
export const FEATURE_KEYS = Object.keys(FEATURES);
