// lib/quests.js : 3 défis par jour, les mêmes pour une date donnée
const POOL = [
  { action: "nourrir", label: "Lui donner à manger", target: 3 },
  { action: "laver", label: "La laver", target: 2 },
  { action: "jouer", label: "Jouer avec elle", target: 3 },
  { action: "calin", label: "Lui faire des câlins", target: 5 },
  { action: "chatouiller", label: "La chatouiller", target: 6 },
  { action: "photo", label: "Prendre une photo", target: 1 },
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function questsForDay(dayKey) {
  let seed = hash(String(dayKey));
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pool = POOL.slice();
  const list = [];
  while (list.length < 3 && pool.length) {
    const q = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    list.push({ id: `${dayKey}:${q.action}`, action: q.action, label: q.label, target: q.target, progress: 0, claimed: false });
  }
  return list;
}
