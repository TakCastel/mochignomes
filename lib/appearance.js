// lib/appearance.js : son apparence. Chaque œuf donne une créature unique, découverte à
// l'éclosion (graine = store.tasteSeed, comme ses goûts) ; elle la garde toute sa vie.
//
//   appearanceFor(seed) -> {
//     colorKey, color, color2?, gradient?,      couleur de base (#hex), seconde couleur, dégradé légendaire
//     pattern: "uni" | "bicolore" | "taches" | "brillant" | "degrade",
//     legend?: "arc-en-ciel" | "galaxie",       seulement pour pattern "degrade" (légendaire)
//     body: "rond" | "goutte" | "mochi" | "poire",
//     tuft: "feuille" | "boucle" | "antennes" | "crete" | "aucune",
//     ears: "rondes" | "pointues" | "tombantes" | null,
//     rarity: "commune" | "rare" | "tres-rare" | "legendaire",
//     label,                                    « Menthe », « Prune tachetée », « Arc-en-ciel »
//   }
//   ORIGINAL_APPEARANCE : le look d'origine (orange, rond, feuille, sans oreilles), gardé par les
//                         créatures écloses avant l'arrivée des apparences.
//   RARITY_ODDS / RARITY_INFO / TRAIT_ODDS : chances publiées (affichées honnêtement dans l'appli)
//   appearanceText(app) -> { label, shape, rarity, rarityLabel, swatch } pour l'interface
//
// Tirage (chaque trait est tiré indépendamment) :
//   légendaire (dégradé arc-en-ciel ou galaxie) ......... 1 %
//   sinon couleur : 10 couleurs douces ................. 88 % (8,8 % chacune)
//                   4 couleurs rares ................... 12 % (3 % chacune)
//         motif   : uni 94 %, bicolore 3 %, taches 2 %, brillant 1 %
//   forme   : rond 55 %, goutte 15 %, mochi 15 %, poire 15 %        (sans effet sur la rareté)
//   houppe  : feuille 40 %, boucle 15 %, antennes 15 %, crête 15 %, aucune 15 % (idem)
//   oreilles: aucune 80 %, rondes 8 %, pointues 7 %, tombantes 5 %
//
// Rareté = cumul : couleur rare +1, oreilles +1, motif (bicolore/taches/brillant) +3.
//   0 point -> commune, 1-2 -> rare, 3 et plus -> très rare ; dégradé -> légendaire.
//   Soit (calculé plus bas, RARITY_ODDS) : commune ≈ 65,5 %, rare ≈ 27,5 %, très rare ≈ 5,9 %,
//   légendaire = 1 %.
import { seededRandom } from "~/lib/catalog";

export const BODY_COLORS = {
  // douces (communes)
  orange: { label: "Orange", color: "#f8a33b" },
  peche: { label: "Pêche", color: "#ffb48c" },
  menthe: { label: "Menthe", color: "#8fdcb4" },
  lavande: { label: "Lavande", color: "#b9a6f0" },
  rose: { label: "Rose", color: "#ffa3c2" },
  ciel: { label: "Ciel", color: "#8ec8ff" },
  citron: { label: "Citron", color: "#ffdc5e" },
  corail: { label: "Corail", color: "#ff8c74" },
  sable: { label: "Sable", color: "#e8c898" },
  pistache: { label: "Pistache", color: "#b6d86c" },
  // rares
  turquoise: { label: "Turquoise", color: "#3fc8c2", rare: true },
  prune: { label: "Prune", color: "#a26ab4", rare: true },
  framboise: { label: "Framboise", color: "#e6517f", rare: true },
  nuit: { label: "Nuit", color: "#5f70c8", rare: true },
};
const COMMON = Object.keys(BODY_COLORS).filter((k) => !BODY_COLORS[k].rare);
const RARE = Object.keys(BODY_COLORS).filter((k) => BODY_COLORS[k].rare);

export const LEGENDS = {
  "arc-en-ciel": { label: "Arc-en-ciel", color: "#ffb0c8", gradient: ["#ff9fb8", "#ffcf7a", "#fff07e", "#9fe6a6", "#8fd0ff", "#c2a6ff"] },
  galaxie: { label: "Galaxie", color: "#6f6ae6", gradient: ["#8a78f2", "#6a6be0", "#4f7fe0", "#5aa6ec"] },
};

export const SHAPES = { rond: "Toute ronde", goutte: "En goutte", mochi: "Mochi", poire: "En poire" };
export const TUFTS = { feuille: "Feuille", boucle: "Bouclette", antennes: "Antennes", crete: "Crête", aucune: "Sans houppe" };
export const EARS = { rondes: "Oreilles rondes", pointues: "Oreilles pointues", tombantes: "Oreilles tombantes" };
const PATTERN_SUFFIX = { bicolore: "bicolore", taches: "tachetée", brillant: "brillante" };

// chances de chaque trait (poids relatifs, somme = 1)
export const TRAIT_ODDS = {
  legendary: 0.01,
  rareColor: 0.12,
  pattern: { uni: 0.94, bicolore: 0.03, taches: 0.02, brillant: 0.01 },
  body: { rond: 0.55, goutte: 0.15, mochi: 0.15, poire: 0.15 },
  tuft: { feuille: 0.4, boucle: 0.15, antennes: 0.15, crete: 0.15, aucune: 0.15 },
  ears: { aucune: 0.8, rondes: 0.08, pointues: 0.07, tombantes: 0.05 },
};

export const RARITY_INFO = {
  commune: { label: "Commune", shout: "", color: "#7a8494" },
  rare: { label: "Rare", shout: "Rare !", color: "#2fa6c9" },
  "tres-rare": { label: "Très rare", shout: "Très rare !", color: "#8a63e0" },
  legendaire: { label: "Légendaire", shout: "Légendaire !", color: "#e09a00" },
};

// chances de chaque rareté, calculées à partir des traits (toujours cohérentes avec le tirage)
export const RARITY_ODDS = (() => {
  const o = TRAIT_ODDS;
  const rest = 1 - o.legendary;
  const special = 1 - o.pattern.uni;
  const ears = 1 - o.ears.aucune;
  const commune = rest * o.pattern.uni * (1 - o.rareColor) * (1 - ears);
  const tresRare = rest * special;
  return Object.freeze({ commune, rare: rest - commune - tresRare, "tres-rare": tresRare, legendaire: o.legendary });
})();

function pickWeighted(rand, table) {
  let r = rand();
  const keys = Object.keys(table);
  for (const k of keys) { r -= table[k]; if (r < 0) return k; }
  return keys[keys.length - 1];
}

const mixHex = (a, b, t) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (n, sh) => (n >> sh) & 255;
  return "#" + [16, 8, 0].map((sh) => Math.round(ch(A, sh) + (ch(B, sh) - ch(A, sh)) * t).toString(16).padStart(2, "0")).join("");
};

// seconde couleur des motifs : taches = nuance de la base (plus claire ou plus soutenue),
// bicolore = ventre crème ou une autre couleur douce
function secondColor(rand, baseKey, pattern) {
  if (pattern === "brillant") return undefined;
  const base = BODY_COLORS[baseKey].color;
  if (pattern === "taches") return rand() < 0.5 ? mixHex(base, "#ffffff", 0.55) : mixHex(base, "#3a2440", 0.28);
  if (rand() < 0.5) return "#fff4e2"; // ventre crème
  const pool = COMMON.filter((k) => k !== baseKey);
  return BODY_COLORS[pool[Math.floor(rand() * pool.length)]].color;
}

export const ORIGINAL_APPEARANCE = Object.freeze({
  colorKey: "orange", color: BODY_COLORS.orange.color, pattern: "uni", body: "rond", tuft: "feuille", ears: null,
  rarity: "commune", label: "Orange", original: true,
});

const cache = new Map();
export function appearanceFor(seed) {
  const key = String(seed ?? "");
  if (cache.has(key)) return cache.get(key);
  const rand = seededRandom(`apparence:${key}`);
  const o = TRAIT_ODDS;
  const legendary = rand() < o.legendary;
  const body = pickWeighted(rand, o.body);
  const tuft = pickWeighted(rand, o.tuft);
  const earsKey = pickWeighted(rand, o.ears);
  const ears = earsKey === "aucune" ? null : earsKey;
  let app;
  if (legendary) {
    const legend = rand() < 0.5 ? "arc-en-ciel" : "galaxie";
    const L = LEGENDS[legend];
    app = { colorKey: legend, color: L.color, gradient: L.gradient.slice(), pattern: "degrade", legend, body, tuft, ears, rarity: "legendaire", label: L.label };
  } else {
    const rare = rand() < o.rareColor;
    const list = rare ? RARE : COMMON;
    const colorKey = list[Math.floor(rand() * list.length)];
    const pattern = pickWeighted(rand, o.pattern);
    const color2 = secondColor(rand, colorKey, pattern);
    const points = (rare ? 1 : 0) + (ears ? 1 : 0) + (pattern !== "uni" ? 3 : 0);
    const rarity = points >= 3 ? "tres-rare" : points >= 1 ? "rare" : "commune";
    const base = BODY_COLORS[colorKey];
    const label = pattern === "uni" ? base.label : `${base.label} ${PATTERN_SUFFIX[pattern]}`;
    app = { colorKey, color: base.color, pattern, body, tuft, ears, rarity, label };
    if (color2) app.color2 = color2;
  }
  app = Object.freeze(app);
  cache.set(key, app);
  return app;
}

// Texte et pastille pour l'interface
export function appearanceText(app) {
  const a = app || ORIGINAL_APPEARANCE;
  const info = RARITY_INFO[a.rarity] || RARITY_INFO.commune;
  const swatch = a.gradient
    ? `linear-gradient(135deg, ${a.gradient.join(", ")})`
    : a.pattern === "bicolore" && a.color2 ? `linear-gradient(180deg, ${a.color} 55%, ${a.color2} 55%)`
    : a.pattern === "taches" && a.color2 ? `radial-gradient(circle at 30% 35%, ${a.color2} 18%, transparent 19%), radial-gradient(circle at 70% 68%, ${a.color2} 14%, transparent 15%), ${a.color}`
    : a.pattern === "brillant" ? `radial-gradient(circle at 32% 28%, #fff 0 12%, transparent 40%), ${a.color}`
    : a.color;
  const details = [SHAPES[a.body] || SHAPES.rond, TUFTS[a.tuft] || TUFTS.feuille];
  if (a.ears) details.push(EARS[a.ears]);
  return { label: a.label, shape: details.join(" · "), rarity: a.rarity, rarityLabel: info.label, shout: info.shout, rarityColor: info.color, swatch };
}

// Pourcentage lisible (« 27,5 % », « 1 % »)
export const oddsText = (p) => `${(Math.round(p * 1000) / 10).toLocaleString("fr-FR")} %`;
