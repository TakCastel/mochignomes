// lib/wishes.js : envies de la créature
// Envies de soin (action du store), et envies liées à ce qu'on POSSÈDE déjà :
//   plat (action "repas", target = recette au frigo ou cuisinable avec le frigo),
//   activité (action "activite", target = activité débloquée et dont on a l'objet),
//   tenue (action "tenue", target = item possédé, color = couleur possédée, pas déjà portée).
// Elle ne réclame JAMAIS un objet payant ou non possédé.
import { ACTION_UNLOCK_LEVEL } from "~/lib/growth";
import { V1_RECIPES, V1_ACTIVITIES, V1_ITEMS, recipeById, itemById, colorByKey, activityById } from "~/lib/catalog";
import { pick, WISH_TEXTS, WISH_ACTIVITY, wishMealText, wishOutfitText } from "~/lib/dialogue";

export const WISH_POOL = [
  { id: "faim", action: "nourrir", text: "J'ai un petit creux...", icon: "solar:donut-bitten-bold-duotone", ok: (s) => s.hunger < 85, weight: (s) => 1 + (100 - s.hunger) / 40 },
  { id: "bain", action: "laver", text: "Je voudrais un bain !", icon: "solar:waterdrop-bold-duotone", ok: (s) => s.cleanliness < 85, weight: (s) => 1 + (100 - s.cleanliness) / 40 },
  { id: "jeu", action: "jouer", text: "On joue ensemble ?", icon: "solar:football-bold-duotone", ok: (s) => s.fun < 88 && s.energy >= 15, weight: (s) => 1 + (100 - s.fun) / 40 },
  { id: "calin", action: "calin", text: "Un peu de tendresse ?", icon: "solar:heart-bold-duotone", ok: () => true, weight: () => 1.2 },
  { id: "chatouille", action: "chatouiller", text: "Fais-moi rire !", icon: "solar:hand-stars-bold-duotone", ok: () => true, weight: () => 0.8 },
  { id: "danse", action: "danser", text: "J'ai envie de danser !", icon: "solar:music-notes-bold-duotone", ok: (s) => s.level >= ACTION_UNLOCK_LEVEL.danser && s.fun < 88 && s.energy >= 20, weight: () => 1 },
  { id: "dodo", action: "coucher", text: "Je commence à avoir sommeil...", icon: "solar:moon-sleep-bold-duotone", ok: (s) => s.energy < 40, weight: (s) => 1 + (60 - s.energy) / 20 },
];

// plusieurs façons de le dire : lib/dialogue.js WISH_TEXTS (par id), WISH_ACTIVITY
const wishText = (w) => (WISH_TEXTS[w.id] ? pick(WISH_TEXTS[w.id]) : w.text);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lc = (s) => String(s || "").toLowerCase();

// Envies « objets possédés ». s = instantané (voir pickWish). Renvoie [{ id, action, target, color?, text, icon, weight }]
export function ownedWishes(s) {
  const out = [];
  const f = s.features || {};
  const t = s.tastes || {};
  // plat : au frigo, ou recette connue cuisinable avec ce qu'il y a dans le frigo
  if (f.cuisine && s.hunger < 80) {
    const pantry = s.pantry || {}, meals = s.meals || {};
    const known = new Set(s.recipesKnown || []);
    const can = (r) => (meals[r.id] || 0) > 0 || (known.has(r.id) && Object.entries(r.ingredients).every(([id, n]) => (pantry[id] || 0) >= n));
    const list = V1_RECIPES.filter(can);
    if (list.length) {
      const fav = list.find((r) => r.id === t.food);
      const r = fav && Math.random() < 0.6 ? fav : pickOne(list);
      const text = wishMealText(r.label, r.id === t.food && s.stage !== "bebe");
      out.push({ id: `repas:${r.id}`, action: "repas", target: r.id, text, icon: "solar:chef-hat-bold-duotone", weight: 1 + (100 - s.hunger) / 60 });
    }
  }
  // activité débloquée, objet possédé, assez d'énergie
  const props = s.props || [];
  const acts = V1_ACTIVITIES.filter((a) => (!a.feature || f[a.feature]) && (!a.prop || props.includes(a.prop)) && s.energy >= (a.energyCost || 0) + 10);
  if (acts.length) {
    const fav = acts.find((a) => a.id === t.activity);
    const a = fav && Math.random() < 0.5 ? fav : pickOne(acts);
    out.push({ id: `activite:${a.id}`, action: "activite", target: a.id, text: pick(WISH_ACTIVITY[a.id] || [`On fait : ${lc(a.label)} ?`]), icon: a.icon, weight: s.fun < 90 ? 1.4 : 1 });
  }
  // tenue : un vêtement possédé qu'elle ne porte pas
  if (f.sac) {
    const owned = s.owned || {}, outfit = s.outfit || {};
    const cands = [];
    for (const it of V1_ITEMS) {
      for (const c of owned[it.id] || []) {
        const cur = outfit[it.slot];
        if (cur && cur.id === it.id && cur.color === c) continue;
        if (it.id === t.itemDislike || c === t.colorDislike) continue;
        const love = it.id === t.itemLove || c === t.color;
        cands.push({ it, c, w: love ? 3 : 1 });
      }
    }
    if (cands.length) {
      let r = Math.random() * cands.reduce((a, x) => a + x.w, 0);
      let ch = cands[0];
      for (const x of cands) { r -= x.w; if (r <= 0) { ch = x; break; } }
      const name = `${lc(ch.it.label)} ${lc(colorByKey(ch.c)?.label)}`;
      out.push({ id: `tenue:${ch.it.id}:${ch.c}`, action: "tenue", target: ch.it.id, color: ch.c, text: wishOutfitText(ch.it.id, name), icon: "solar:t-shirt-bold-duotone", weight: 0.9 });
    }
  }
  return out;
}

// Choisit une envie réalisable maintenant (pondérée par les besoins).
// store : instantané { hunger, cleanliness, fun, energy, level, hatchedAt, wish, lastWishId,
//   stage?, features?, tastes?, owned?, outfit?, meals?, pantry?, recipesKnown?, props? }
export function pickWish(store, now = Date.now()) {
  const s = {
    hunger: store.hunger, cleanliness: store.cleanliness, fun: store.fun,
    energy: store.energy, level: store.level, stage: store.stage, features: store.features, tastes: store.tastes,
    owned: store.owned, outfit: store.outfit, meals: store.meals, pantry: store.pantry, recipesKnown: store.recipesKnown, props: store.props,
  };
  const early = store.hatchedAt && now - store.hatchedAt < 15 * 60000;
  const base = WISH_POOL.filter((w) => w.ok(s)).map((w) => ({ id: w.id, action: w.action, text: w.text, icon: w.icon, weight: w.weight(s) }));
  const all = [...base, ...(early ? [] : ownedWishes(s))];
  const recent = new Set(store.recentWishIds || []);
  const fresh = all.filter((w) => w.id !== store.wish?.id && w.id !== store.lastWishId);
  // pas de redite d'une envie récente tant qu'il reste d'autres idées
  const varied = fresh.filter((w) => !recent.has(w.id));
  const options = varied.length ? varied : fresh;
  const pool = options.length ? options : all.filter((w) => w.id === "calin");
  const list = pool.length ? pool : [{ id: "calin", action: "calin", text: "Un peu de tendresse ?", icon: "solar:heart-bold-duotone", weight: 1 }];
  const total = list.reduce((a, w) => a + w.weight, 0);
  let r = Math.random() * total;
  let chosen = list[0];
  for (const w of list) { r -= w.weight; if (r <= 0) { chosen = w; break; } }
  const life = early ? 90000 : 10 * 60000;
  const wish = { id: chosen.id, action: chosen.action, text: wishText(chosen), icon: chosen.icon, at: now, expiresAt: now + life };
  if (chosen.target) wish.target = chosen.target;
  if (chosen.color) wish.color = chosen.color;
  return wish;
}

// Libellé court de l'objet d'une envie (« Crêpes », « Bonnet rouge », « Foot »), ou ""
export function wishTargetLabel(wish) {
  if (!wish?.target) return "";
  if (wish.action === "repas") return recipeById(wish.target)?.label || "";
  if (wish.action === "activite") return activityById(wish.target)?.label || "";
  if (wish.action === "tenue") return `${itemById(wish.target)?.label || ""} ${lc(colorByKey(wish.color)?.label)}`.trim();
  return "";
}
