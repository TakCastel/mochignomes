// lib/quests.js : 4 défis par jour, les mêmes pour une date (et un niveau) donnés.
// Chaque défi compte un événement du store (`countEvent(action)`), et rapporte
// de l'expérience et des pièces quand on le récupère.
export const QUESTS_PER_DAY = 4;

// kind "soin" : soins de base ; "jeu" : nouveautés (activités, cuisine, boutique, garde-robe)
const POOL = [
  { action: "nourrir", label: "Lui donner à manger", target: 3, kind: "soin", icon: "solar:donut-bitten-bold-duotone" },
  { action: "laver", label: "La laver", target: 2, kind: "soin", icon: "solar:bath-bold-duotone" },
  { action: "jouer", label: "Jouer avec elle", target: 3, kind: "soin", icon: "solar:football-bold-duotone" },
  { action: "calin", label: "Lui faire des câlins", target: 5, kind: "soin", icon: "solar:hand-heart-bold-duotone" },
  { action: "chatouiller", label: "La chatouiller", target: 6, kind: "soin", icon: "solar:emoji-funny-circle-bold-duotone" },
  { action: "photo", label: "Prendre une photo", target: 1, kind: "soin", icon: "solar:camera-bold-duotone" },
  { action: "activite", label: "Faire 2 activités avec elle", target: 2, kind: "jeu", icon: "solar:running-bold-duotone" },
  { action: "activite:foot", label: "Jouer au foot ensemble", target: 1, kind: "jeu", icon: "solar:football-bold-duotone" },
  { action: "activite:course", label: "Faire une course", target: 1, kind: "jeu", icon: "solar:running-bold-duotone", minLevel: 2, needsProp: "baskets" },
  { action: "activite:tele", label: "Regarder la télé avec elle", target: 1, kind: "jeu", icon: "solar:tv-bold-duotone", needsProp: "tele" },
  { action: "repas", label: "Lui servir un bon repas", target: 1, kind: "jeu", icon: "solar:chef-hat-bold-duotone" },
  { action: "cuisine", label: "Cuisiner 2 recettes", target: 2, kind: "jeu", icon: "solar:chef-hat-bold-duotone" },
  { action: "achat", label: "Faire un achat à la boutique", target: 1, kind: "jeu", icon: "solar:shop-bold-duotone" },
  { action: "habillage", label: "Changer sa tenue", target: 2, kind: "jeu", icon: "solar:t-shirt-bold-duotone" },
  { action: "coffre", label: "Ouvrir le coffre du jour", target: 1, kind: "jeu", icon: "solar:gift-bold-duotone" },
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Récompense d'un défi : plus l'objectif est long, plus c'est généreux
export function questReward(q, level = 1) {
  const base = q.kind === "jeu" ? 22 : 15;
  return { xp: 10 + Math.min(10, q.target * 2), coins: base + Math.min(8, q.target * 2) + Math.min(10, Math.floor(level / 2)) };
}

// props : objets possédés (facultatif) pour éviter un défi impossible
export function questsForDay(dayKey, level = 1, props = null) {
  let seed = hash(String(dayKey));
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const ok = (q) => (q.minLevel || 1) <= level && (!q.needsProp || (props && props.includes(q.needsProp)));
  const soins = POOL.filter((q) => q.kind === "soin" && ok(q));
  const jeux = POOL.filter((q) => q.kind === "jeu" && ok(q));
  const list = [];
  const take = (pool) => {
    if (!pool.length) return;
    const q = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const reward = questReward(q, level);
    list.push({ id: `${dayKey}:${q.action}`, action: q.action, label: q.label, icon: q.icon, target: q.target, progress: 0, claimed: false, xp: reward.xp, coins: reward.coins });
  };
  // 2 soins + 2 nouveautés, puis on complète au hasard si un groupe est vide
  take(soins); take(soins); take(jeux); take(jeux);
  const rest = [...soins, ...jeux];
  while (list.length < QUESTS_PER_DAY && rest.length) take(rest);
  return list;
}
