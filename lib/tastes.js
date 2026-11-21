// lib/tastes.js : ses goûts. Chaque œuf a sa personnalité (graine = hatchedAt + nom, figée à
// l'éclosion dans store.tasteSeed). On les découvre en jouant : c'est la collection principale
// (carnet « Ce qu'elle aime », révélé dans inventory.stats.tastesSeen).
//
//   tastesFor(seed) -> { color, colorDislike, food, foodDislike, channel, activity, itemLove, itemDislike }
//   reaction(kind, id, color?, store) -> { mood: "love"|"like"|"meh"|"dislike", mult, line, reveal: [clés] }
//     kind : "color" (id = clé couleur) | "food" (id = recette) | "channel" (id = chaîne télé)
//            | "activity" (id = activité) | "item" (id = item, color = couleur portée)
//     store : le store principal (ou un objet { tasteSeed | tastes, stage, traits, name })
//     reveal : clés de TASTE_KEYS que cette réaction vient de montrer (à passer à inventory.revealTaste)
//   tasteLabel(key, tastes) -> texte du carnet (« Couleur préférée : rose »)
import { COLORS, V1_ITEMS, V1_RECIPES, itemById, recipeById, activityById, colorByKey, seededRandom } from "~/lib/catalog";
import { reactionLine } from "~/lib/dialogue";

// Chaînes de la télé (lib/activities3d.js doit utiliser ces identifiants)
export const CHANNELS = [
  { id: "dessin-anime", label: "Dessin animé" },
  { id: "nature", label: "Nature" },
  { id: "cuisine", label: "Cuisine" },
];
// Couleurs qu'elle peut adorer : toutes disponibles pour le t-shirt offert
export const TASTE_COLORS = ["blanc", "rouge", "jaune", "vert", "bleu", "violet", "rose", "noir"];
// Activités qu'elle peut préférer (V1)
export const TASTE_ACTIVITIES = ["foot", "course", "tele"];

// Clés du carnet, dans l'ordre d'affichage
export const TASTE_KEYS = ["color", "food", "activity", "channel", "itemLove", "colorDislike", "foodDislike", "itemDislike"];

export const MULT = { love: 1.5, like: 1.1, meh: 1, dislike: 0.5 };

function pickTwo(rand, list) {
  const a = Math.floor(rand() * list.length);
  let b = Math.floor(rand() * (list.length - 1));
  if (b >= a) b += 1;
  return [list[a], list[b % list.length]];
}

const cache = new Map();
export function tastesFor(seed) {
  const key = String(seed ?? "");
  if (cache.has(key)) return cache.get(key);
  const rand = seededRandom(`gouts:${key}`);
  const [color, colorDislike] = pickTwo(rand, TASTE_COLORS);
  const foods = V1_RECIPES.map((r) => r.id);
  const [food, foodDislike] = pickTwo(rand, foods);
  const channel = CHANNELS[Math.floor(rand() * CHANNELS.length)].id;
  const activity = TASTE_ACTIVITIES[Math.floor(rand() * TASTE_ACTIVITIES.length)];
  const items = V1_ITEMS.filter((i) => !i.premium && i.slot !== "haut").map((i) => i.id);
  const [itemLove, itemDislike] = pickTwo(rand, items);
  const t = Object.freeze({ color, colorDislike, food, foodDislike, channel, activity, itemLove, itemDislike });
  cache.set(key, t);
  return t;
}

// Graine des goûts d'un store (figée à l'éclosion ; secours : hatchedAt + nom)
export const tasteSeedOf = (store) => store?.tasteSeed || `${store?.hatchedAt || 0}${store?.name || ""}`;
export const tastesOf = (store) => store?.tastes || tastesFor(tasteSeedOf(store));

const labelOf = (kind, id) => {
  if (kind === "color") return colorByKey(id)?.label.toLowerCase() || id;
  if (kind === "food") return recipeById(id)?.label.toLowerCase() || id;
  if (kind === "activity") return activityById(id)?.label.toLowerCase() || id;
  if (kind === "channel") return CHANNELS.find((c) => c.id === id)?.label.toLowerCase() || id;
  if (kind === "item") return itemById(id)?.label.toLowerCase() || id;
  return String(id);
};

export function reaction(kind, id, color, store) {
  const t = tastesOf(store);
  const stage = store?.stage || "bebe";
  const traits = store?.traits || {};
  let mood = "meh";
  const reveal = [];
  let label = labelOf(kind, id);
  switch (kind) {
    case "color":
      if (id === t.color) { mood = "love"; reveal.push("color"); } else if (id === t.colorDislike) { mood = "dislike"; reveal.push("colorDislike"); }
      break;
    case "food":
      if (id === t.food) { mood = "love"; reveal.push("food"); } else if (id === t.foodDislike) { mood = "dislike"; reveal.push("foodDislike"); } else if ((traits.gourmande || 0) > 0.4) mood = "like";
      break;
    case "activity":
      if (id === t.activity) { mood = "love"; reveal.push("activity"); } else if ((traits.joueuse || 0) > 0.4 && id !== "tele") mood = "like";
      break;
    case "channel":
      if (id === t.channel) { mood = "love"; reveal.push("channel"); }
      break;
    case "item": {
      let score = 0;
      if (id === t.itemLove) { score += 2; reveal.push("itemLove"); }
      if (id === t.itemDislike) { score -= 2; reveal.push("itemDislike"); }
      if (color && color === t.color) { score += 1; reveal.push("color"); }
      if (color && color === t.colorDislike) { score -= 1; reveal.push("colorDislike"); }
      if (score >= 1) mood = "love";
      else if (score <= -1) mood = "dislike";
      else if ((traits.coquette || 0) > 0.4) mood = "like";
      if (color && COLORS[color]) label = `${label} ${COLORS[color].label.toLowerCase()}`;
      break;
    }
  }
  // un bébé aime tout : pas de bouderie (et rien à révéler côté « n'aime pas »)
  if (stage === "bebe" && mood === "dislike") {
    mood = "like";
    reveal.length = 0;
  }
  return { mood, mult: MULT[mood], line: reactionLine(stage, mood, kind, label, traits), reveal };
}

// Texte d'une entrée du carnet
export function tasteLabel(key, tastes) {
  const v = tastes?.[key];
  switch (key) {
    case "color": return `Couleur préférée : ${labelOf("color", v)}`;
    case "colorDislike": return `Couleur qu'elle n'aime pas : ${labelOf("color", v)}`;
    case "food": return `Plat préféré : ${labelOf("food", v)}`;
    case "foodDislike": return `Plat qu'elle boude : ${labelOf("food", v)}`;
    case "channel": return `Émission préférée : ${labelOf("channel", v)}`;
    case "activity": return `Activité préférée : ${labelOf("activity", v)}`;
    case "itemLove": return `Accessoire chouchou : ${labelOf("item", v)}`;
    case "itemDislike": return `Accessoire qu'elle déteste : ${labelOf("item", v)}`;
    default: return "";
  }
}
