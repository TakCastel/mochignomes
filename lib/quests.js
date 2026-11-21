// lib/quests.js : 3 défis par jour, les mêmes pour une date (et une progression) donnée :
//   1 soin, 1 objectif de score (activité), 1 envie de plat ou de tenue.
// + un bonus quand les 3 sont récupérés (QUEST_BONUS). Pas d'achat, pas de coffre, pas
// de « change de tenue » : les premières fois sont des étapes de tutoriel, pas des défis.
// Chaque défi compte un événement du store (`countEvent(action, n, value)`) ; un défi avec
// `min` ne progresse que si `value >= min` (ex. score:foot, min 10 = « faire 10 jongles »).
export const QUESTS_PER_DAY = 3;
export const QUEST_BONUS = { coins: 30, xp: 15 };

const SOIN = [
  { action: "nourrir", label: "Lui donner à manger", target: 3, icon: "solar:donut-bitten-bold-duotone" },
  { action: "laver", label: "La laver", target: 2, icon: "solar:bath-bold-duotone" },
  { action: "jouer", label: "Jouer avec elle", target: 3, icon: "solar:football-bold-duotone" },
  { action: "calin", label: "Lui faire coucou", target: 5, icon: "solar:hand-heart-bold-duotone" },
  { action: "chatouiller", label: "La faire rire", target: 6, icon: "solar:emoji-funny-circle-bold-duotone" },
  { action: "photo", label: "Prendre une photo", target: 1, icon: "solar:camera-bold-duotone" },
];
// need : clé de déblocage (features) requise ; prop : objet requis
const SCORE = [
  { action: "score:foot", min: 10, label: "Faire 10 jongles", target: 1, icon: "solar:football-bold-duotone", need: "ballon", prop: "ballon" },
  { action: "score:foot", min: 20, label: "Faire 20 jongles", target: 1, icon: "solar:football-bold-duotone", need: "course", prop: "ballon" },
  { action: "activite:foot", label: "Jouer 2 fois au foot", target: 2, icon: "solar:football-bold-duotone", need: "ballon", prop: "ballon" },
  { action: "score:course", min: 200, label: "Courir 200 m", target: 1, icon: "solar:running-bold-duotone", need: "course", prop: "baskets" },
  { action: "activite:tele", label: "Regarder la télé avec elle", target: 1, icon: "solar:tv-bold-duotone", need: "tele", prop: "tele" },
];
const ENVIE = [
  { action: "envie", label: "Exaucer 2 de ses envies", target: 2, icon: "solar:chat-round-dots-bold-duotone" },
  { action: "repas", label: "Lui servir un bon petit plat", target: 1, icon: "solar:chef-hat-bold-duotone", need: "cuisine" },
  { action: "tenue-aimee", label: "Lui mettre quelque chose qu'elle adore", target: 1, icon: "solar:t-shirt-bold-duotone", need: "sac" },
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Récompense d'un défi : plus l'objectif est long, plus c'est généreux
export function questReward(q, level = 1) {
  const base = q.kind === "soin" ? 12 : 18;
  return { xp: 10 + Math.min(10, q.target * 2), coins: base + Math.min(8, q.target * 2) + Math.min(10, Math.floor(level / 2)) };
}

// ctx : { props: string[], features: { [clé]: bool } } (ou, ancien format, le tableau des objets)
export function questsForDay(dayKey, level = 1, ctx = null) {
  let seed = hash(String(dayKey));
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const props = Array.isArray(ctx) ? ctx : ctx?.props || [];
  const features = Array.isArray(ctx) ? null : ctx?.features || null;
  const ok = (q) => (!q.need || !features || features[q.need]) && (!q.prop || props.includes(q.prop));
  const soins = SOIN.slice();
  const list = [];
  const take = (pool, kind) => {
    const avail = pool.filter(ok).filter((q) => !list.some((l) => l.action === q.action));
    if (!avail.length) return false;
    const q = avail[Math.floor(rand() * avail.length)];
    const reward = questReward({ ...q, kind }, level);
    const item = { id: `${dayKey}:${q.action}${q.min ? `:${q.min}` : ""}`, kind, action: q.action, label: q.label, icon: q.icon, target: q.target, progress: 0, claimed: false, xp: reward.xp, coins: reward.coins };
    if (q.min) item.min = q.min;
    list.push(item);
    return true;
  };
  take(soins, "soin");
  if (!take(SCORE, "score")) take(soins, "soin");
  if (!take(ENVIE, "envie")) take(soins, "soin");
  return list;
}
