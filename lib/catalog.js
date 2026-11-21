// lib/catalog.js
// Catalogue du jeu : vêtements et couleurs, collections, épicerie, recettes,
// objets d'activité et activités. Données pures + petites fonctions d'aide,
// partagées par les stores, la boutique, la garde-robe, la cuisine et la 3D.

// ---------------------------------------------------------------------
// Emplacements
// ---------------------------------------------------------------------
export const SLOTS = ["tete", "yeux", "cou", "haut", "dos"];
export const SLOT_LABELS = { tete: "Tête", yeux: "Yeux", cou: "Cou", haut: "Haut", dos: "Dos" };
export const SLOT_ICONS = {
  tete: "solar:crown-minimalistic-bold-duotone",
  yeux: "solar:glasses-bold-duotone",
  cou: "solar:hanger-bold-duotone",
  haut: "solar:t-shirt-bold-duotone",
  dos: "solar:bag-4-bold-duotone",
};

// ---------------------------------------------------------------------
// Couleurs : base (pièces) et premium (gemmes)
// ---------------------------------------------------------------------
export const COLORS = {
  blanc: { key: "blanc", label: "Blanc", hex: "#f7f5ef" },
  noir: { key: "noir", label: "Noir", hex: "#2c2c35" },
  rouge: { key: "rouge", label: "Rouge", hex: "#e8453c" },
  corail: { key: "corail", label: "Corail", hex: "#ff7f6b" },
  jaune: { key: "jaune", label: "Jaune", hex: "#ffd23f" },
  vert: { key: "vert", label: "Vert", hex: "#4cbf4b" },
  menthe: { key: "menthe", label: "Menthe", hex: "#7fe0c2" },
  bleu: { key: "bleu", label: "Bleu", hex: "#3b7ddd" },
  ciel: { key: "ciel", label: "Ciel", hex: "#8fd3ff" },
  violet: { key: "violet", label: "Violet", hex: "#9b6be0" },
  rose: { key: "rose", label: "Rose", hex: "#ff8fc1" },
  marron: { key: "marron", label: "Marron", hex: "#8a5a3b" },
  gris: { key: "gris", label: "Gris", hex: "#9aa3ad" },
  // premium : toujours en gemmes
  or: { key: "or", label: "Or", hex: "#ffcc33", hex2: "#b8860b", premium: true, gems: 12 },
  holo: { key: "holo", label: "Holo", hex: "#c8f7ff", hex2: "#f5b8ff", premium: true, gems: 15 },
  arcenciel: { key: "arcenciel", label: "Arc-en-ciel", hex: "#ff5e5e", hex2: "#5ec8ff", premium: true, gems: 18 },
  galaxie: { key: "galaxie", label: "Galaxie", hex: "#2a1b5e", hex2: "#b06bff", premium: true, gems: 20 },
};
export const BASE_COLORS = Object.values(COLORS).filter((c) => !c.premium).map((c) => c.key);
export const PREMIUM_COLORS = Object.values(COLORS).filter((c) => c.premium).map((c) => c.key);

export const RARITIES = {
  commun: { label: "Commun", color: "#8a97a8" },
  rare: { label: "Rare", color: "#3b8ef0" },
  epique: { label: "Épique", color: "#9b5de5" },
  legendaire: { label: "Légendaire", color: "#f5a524" },
};

// Les items premium ne coûtent que des gemmes et apparaissent à partir de ce niveau
export const PREMIUM_LEVEL = 5;
// Couleur supplémentaire d'un item déjà possédé : 40 % du prix
export const EXTRA_COLOR_RATE = 0.4;

// ---------------------------------------------------------------------
// Vêtements et accessoires
// ---------------------------------------------------------------------
const B = (...keys) => keys; // lisibilité
export const ITEMS = [
  // tête
  { id: "bonnet", slot: "tete", label: "Bonnet", set: "hiver", price: 40, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "vert", "jaune", "rose", "blanc", "gris", "or") },
  { id: "casquette", slot: "tete", label: "Casquette", set: "sport", price: 45, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "noir", "blanc", "vert", "jaune", "holo") },
  { id: "chapeau-fete", slot: "tete", label: "Chapeau de fête", set: "fete", price: 30, minLevel: 1, rarity: "commun", colors: B("rose", "ciel", "jaune", "menthe", "violet", "arcenciel") },
  { id: "noeud", slot: "tete", label: "Nœud", set: "chic", price: 35, minLevel: 1, rarity: "commun", colors: B("rose", "rouge", "ciel", "blanc", "noir", "violet", "or") },
  { id: "bob", slot: "tete", label: "Bob", set: "plage", price: 50, minLevel: 2, rarity: "commun", colors: B("jaune", "ciel", "menthe", "corail", "blanc", "marron") },
  { id: "chapeau-paille", slot: "tete", label: "Chapeau de paille", set: "plage", price: 60, minLevel: 2, rarity: "rare", colors: B("jaune", "marron", "blanc", "corail", "or") },
  { id: "oreilles-chat", slot: "tete", label: "Oreilles de chat", set: "fantaisie", price: 70, minLevel: 3, rarity: "rare", colors: B("noir", "blanc", "rose", "gris", "marron", "violet", "galaxie") },
  { id: "couronne", slot: "tete", label: "Couronne", set: "fete", price: 0, gemPrice: 40, premium: true, minLevel: PREMIUM_LEVEL, rarity: "legendaire", colors: B("or", "holo", "galaxie") },
  { id: "corne-licorne", slot: "tete", label: "Corne de licorne", set: "fantaisie", price: 0, gemPrice: 30, premium: true, minLevel: 6, rarity: "epique", colors: B("blanc", "rose", "arcenciel", "holo") },
  // yeux
  { id: "lunettes-rondes", slot: "yeux", label: "Lunettes rondes", set: "chic", price: 40, minLevel: 1, rarity: "commun", colors: B("noir", "marron", "rouge", "bleu", "rose", "or") },
  { id: "lunettes-soleil", slot: "yeux", label: "Lunettes de soleil", set: "plage", price: 55, minLevel: 2, rarity: "commun", colors: B("noir", "rouge", "ciel", "jaune", "blanc", "holo") },
  { id: "lunettes-coeur", slot: "yeux", label: "Lunettes cœur", set: "fete", price: 65, minLevel: 3, rarity: "rare", colors: B("rose", "rouge", "violet", "blanc", "arcenciel") },
  { id: "masque-ski", slot: "yeux", label: "Masque de ski", set: "hiver", price: 70, minLevel: 4, rarity: "rare", colors: B("bleu", "rouge", "noir", "menthe", "holo") },
  { id: "monocle", slot: "yeux", label: "Monocle", set: "chic", price: 90, minLevel: 4, rarity: "epique", colors: B("noir", "gris", "marron", "or") },
  // cou
  { id: "echarpe", slot: "cou", label: "Écharpe", set: "hiver", price: 35, minLevel: 1, rarity: "commun", colors: B("rouge", "vert", "bleu", "jaune", "rose", "gris", "blanc", "arcenciel") },
  { id: "foulard", slot: "cou", label: "Foulard", set: "plage", price: 40, minLevel: 1, rarity: "commun", colors: B("corail", "ciel", "menthe", "jaune", "rouge", "bleu") },
  { id: "noeud-papillon", slot: "cou", label: "Nœud papillon", set: "chic", price: 45, minLevel: 2, rarity: "commun", colors: B("noir", "rouge", "bleu", "rose", "violet", "or") },
  { id: "medaille", slot: "cou", label: "Médaille", set: "sport", price: 60, minLevel: 3, rarity: "rare", colors: B("jaune", "gris", "marron", "or") },
  { id: "collier-perles", slot: "cou", label: "Collier de perles", set: "chic", price: 110, minLevel: 5, rarity: "epique", colors: B("blanc", "rose", "noir", "holo") },
  // haut
  { id: "tshirt", slot: "haut", label: "T-shirt", set: null, price: 30, minLevel: 1, rarity: "commun", colors: B("blanc", "noir", "rouge", "corail", "jaune", "vert", "menthe", "bleu", "ciel", "violet", "rose", "gris", "or", "holo", "arcenciel", "galaxie") },
  { id: "maillot-foot", slot: "haut", label: "Maillot de foot", set: "sport", price: 75, minLevel: 2, rarity: "commun", colors: B("bleu", "rouge", "vert", "jaune", "blanc", "noir", "or") },
  { id: "mariniere", slot: "haut", label: "Marinière", set: "plage", price: 70, minLevel: 2, rarity: "commun", colors: B("bleu", "rouge", "noir", "ciel", "menthe") },
  { id: "sweat", slot: "haut", label: "Sweat à capuche", set: "hiver", price: 80, minLevel: 2, rarity: "commun", colors: B("gris", "noir", "rose", "bleu", "vert", "violet", "jaune", "galaxie") },
  { id: "salopette", slot: "haut", label: "Salopette", set: "fantaisie", price: 90, minLevel: 3, rarity: "rare", colors: B("bleu", "rose", "jaune", "vert", "marron", "corail") },
  { id: "tutu", slot: "haut", label: "Tutu", set: "fete", price: 85, minLevel: 3, rarity: "rare", colors: B("rose", "blanc", "violet", "ciel", "menthe", "holo") },
  { id: "pull-noel", slot: "haut", label: "Pull de Noël", set: "hiver", price: 100, minLevel: 4, rarity: "rare", colors: B("rouge", "vert", "bleu", "blanc", "or") },
  { id: "smoking", slot: "haut", label: "Smoking", set: "chic", price: 140, minLevel: 6, rarity: "epique", colors: B("noir", "blanc", "bleu", "violet", "or") },
  { id: "robe-etoiles", slot: "haut", label: "Robe étoilée", set: "fantaisie", price: 0, gemPrice: 45, premium: true, minLevel: 7, rarity: "legendaire", colors: B("galaxie", "violet", "bleu", "holo") },
  // dos
  { id: "sac-dos", slot: "dos", label: "Sac à dos", set: "sport", price: 60, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "vert", "jaune", "rose", "noir", "violet", "holo") },
  { id: "bouee", slot: "dos", label: "Bouée", set: "plage", price: 45, minLevel: 1, rarity: "commun", colors: B("rouge", "jaune", "rose", "ciel", "menthe", "arcenciel") },
  { id: "ballon-attache", slot: "dos", label: "Ballon attaché", set: "fete", price: 40, minLevel: 2, rarity: "commun", colors: B("rouge", "jaune", "bleu", "rose", "vert", "violet", "or") },
  { id: "cape", slot: "dos", label: "Cape", set: "fantaisie", price: 90, minLevel: 3, rarity: "rare", colors: B("rouge", "violet", "noir", "bleu", "vert", "galaxie") },
  { id: "carapace", slot: "dos", label: "Carapace", set: "plage", price: 75, minLevel: 4, rarity: "rare", colors: B("vert", "marron", "menthe", "bleu", "or") },
  { id: "ailes-papillon", slot: "dos", label: "Ailes de papillon", set: "fantaisie", price: 0, gemPrice: 50, premium: true, minLevel: PREMIUM_LEVEL, rarity: "legendaire", colors: B("rose", "ciel", "jaune", "holo", "arcenciel") },
];
const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const TOTAL_VARIANTS = ITEMS.reduce((n, i) => n + i.colors.length, 0);

// ---------------------------------------------------------------------
// Collections (sets) et leurs récompenses
// ---------------------------------------------------------------------
export const SETS = [
  { id: "sport", label: "Sport", icon: "solar:football-bold-duotone", reward: { coins: 120, gems: 5 } },
  { id: "plage", label: "Plage", icon: "solar:sun-bold-duotone", reward: { coins: 160, gems: 5 } },
  { id: "hiver", label: "Hiver", icon: "solar:snowflake-bold-duotone", reward: { coins: 160, gems: 5 } },
  { id: "chic", label: "Chic", icon: "solar:crown-star-bold-duotone", reward: { coins: 200, gems: 8 } },
  { id: "fete", label: "Fête", icon: "solar:confetti-bold-duotone", reward: { coins: 150, gems: 10 } },
  { id: "fantaisie", label: "Fantaisie", icon: "solar:magic-stick-3-bold-duotone", reward: { coins: 200, gems: 12 } },
].map((s) => ({ ...s, items: ITEMS.filter((i) => i.set === s.id).map((i) => i.id) }));
const SET_MAP = Object.fromEntries(SETS.map((s) => [s.id, s]));

// ---------------------------------------------------------------------
// Épicerie et recettes
// ---------------------------------------------------------------------
export const INGREDIENTS = [
  { id: "pomme", label: "Pomme", emoji: "🍎", icon: "ph:apple-logo-fill", price: 4 },
  { id: "fraise", label: "Fraise", emoji: "🍓", icon: "ph:cherries-fill", price: 5 },
  { id: "banane", label: "Banane", emoji: "🍌", icon: "ph:orange-fill", price: 4 },
  { id: "carotte", label: "Carotte", emoji: "🥕", icon: "ph:carrot-fill", price: 3 },
  { id: "tomate", label: "Tomate", emoji: "🍅", icon: "ph:pepper-fill", price: 3 },
  { id: "salade", label: "Salade", emoji: "🥬", icon: "ph:leaf-fill", price: 3 },
  { id: "farine", label: "Farine", emoji: "🌾", icon: "ph:grains-fill", price: 3 },
  { id: "oeuf", label: "Œuf", emoji: "🥚", icon: "ph:egg-fill", price: 3 },
  { id: "lait", label: "Lait", emoji: "🥛", icon: "ph:drop-fill", price: 3 },
  { id: "fromage", label: "Fromage", emoji: "🧀", icon: "ph:cheese-fill", price: 6 },
  { id: "chocolat", label: "Chocolat", emoji: "🍫", icon: "ph:cookie-fill", price: 7 },
  { id: "riz", label: "Riz", emoji: "🍚", icon: "ph:bowl-food-fill", price: 4 },
  { id: "poisson", label: "Poisson", emoji: "🐟", icon: "ph:fish-fill", price: 9 },
  { id: "miel", label: "Miel", emoji: "🍯", icon: "ph:jar-fill", price: 6 },
];
const ING_MAP = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// effects : points ajoutés aux jauges (avant le bonus d'étoiles)
export const RECIPES = [
  { id: "salade-fruits", label: "Salade de fruits", emoji: "🥗", icon: "ph:bowl-food-fill", ingredients: { pomme: 1, fraise: 1, banane: 1 }, effects: { hunger: 22, fun: 8, health: 6 }, xp: 8, minLevel: 1 },
  { id: "smoothie", label: "Smoothie", emoji: "🥤", icon: "ph:coffee-fill", ingredients: { banane: 1, fraise: 1, lait: 1 }, effects: { hunger: 16, fun: 6, energy: 10, health: 4 }, xp: 8, minLevel: 1 },
  { id: "omelette", label: "Omelette", emoji: "🍳", icon: "ph:egg-fill", ingredients: { oeuf: 2, fromage: 1 }, effects: { hunger: 30, energy: 6 }, xp: 9, minLevel: 1 },
  { id: "soupe", label: "Soupe de légumes", emoji: "🍲", icon: "ph:bowl-steam-fill", ingredients: { carotte: 2, tomate: 1 }, effects: { hunger: 26, health: 12 }, xp: 10, minLevel: 2 },
  { id: "crepes", label: "Crêpes", emoji: "🥞", icon: "ph:cookie-fill", ingredients: { farine: 1, oeuf: 1, lait: 1 }, effects: { hunger: 28, fun: 12 }, xp: 11, minLevel: 2 },
  { id: "croque", label: "Croque-monsieur", emoji: "🥪", icon: "ph:bread-fill", ingredients: { farine: 1, fromage: 1 }, effects: { hunger: 32, fun: 6 }, xp: 11, minLevel: 3 },
  { id: "pizza", label: "Pizza", emoji: "🍕", icon: "ph:pizza-fill", ingredients: { farine: 1, tomate: 1, fromage: 1 }, effects: { hunger: 38, fun: 14, cleanliness: -4 }, xp: 14, minLevel: 3 },
  { id: "riz-cantonais", label: "Riz cantonais", emoji: "🍛", icon: "ph:bowl-food-fill", ingredients: { riz: 1, oeuf: 1, carotte: 1 }, effects: { hunger: 36, energy: 8, health: 6 }, xp: 13, minLevel: 4 },
  { id: "tarte-pommes", label: "Tarte aux pommes", emoji: "🥧", icon: "ph:cake-fill", ingredients: { farine: 1, pomme: 2, oeuf: 1 }, effects: { hunger: 30, fun: 16 }, xp: 14, minLevel: 4 },
  { id: "glace-fraise", label: "Glace à la fraise", emoji: "🍨", icon: "ph:ice-cream-fill", ingredients: { fraise: 2, lait: 1, miel: 1 }, effects: { hunger: 12, fun: 22, energy: 6 }, xp: 12, minLevel: 5 },
  { id: "sushis", label: "Sushis", emoji: "🍣", icon: "ph:fish-fill", ingredients: { riz: 1, poisson: 1, salade: 1 }, effects: { hunger: 34, health: 16, energy: 8 }, xp: 18, minLevel: 6 },
  { id: "gateau-chocolat", label: "Gâteau au chocolat", emoji: "🎂", icon: "ph:cake-fill", ingredients: { farine: 1, oeuf: 2, chocolat: 1, lait: 1 }, effects: { hunger: 30, fun: 26 }, xp: 20, minLevel: 7 },
];
const RECIPE_MAP = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
// multiplicateur des effets selon la note de préparation (1 à 3 étoiles)
export const STAR_MULT = { 1: 1, 2: 1.25, 3: 1.5 };
export const starMult = (stars) => STAR_MULT[Math.max(1, Math.min(3, Math.round(Number(stars) || 1)))];

// ---------------------------------------------------------------------
// Objets d'activité et activités
// ---------------------------------------------------------------------
export const PROPS = [
  { id: "ballon", label: "Ballon", icon: "ph:soccer-ball-fill", price: 0, minLevel: 1, activity: "foot" },
  { id: "tele", label: "Télé", icon: "ph:television-simple-fill", price: 80, minLevel: 1, activity: "tele" },
  { id: "baskets", label: "Baskets", icon: "ph:sneaker-move-fill", price: 90, minLevel: 2, activity: "course" },
  { id: "micro", label: "Micro", icon: "ph:microphone-stage-fill", price: 120, minLevel: 3, activity: "danse" },
  { id: "canne", label: "Canne à pêche", icon: "ph:fish-simple-fill", price: 110, minLevel: 4, activity: "peche" },
];
const PROP_MAP = Object.fromEntries(PROPS.map((p) => [p.id, p]));

// scoreRef : score qui donne la récompense maximale ; xp : expérience de base
export const ACTIVITIES = [
  { id: "tele", label: "Regarder la télé", icon: "solar:tv-bold-duotone", prop: "tele", minLevel: 1, energyCost: 2, funGain: 18, xp: 6, scoreRef: 10, scoreUnit: "pts", desc: "Un moment tout doux sur le canapé. Change de chaîne pour trouver son émission préférée." },
  { id: "foot", label: "Foot", icon: "solar:football-bold-duotone", prop: "ballon", minLevel: 1, energyCost: 10, funGain: 20, xp: 10, scoreRef: 30, scoreUnit: "jongles", desc: "Jongles et tirs au but : touche le ballon au bon moment !" },
  { id: "course", label: "Course", icon: "solar:running-bold-duotone", prop: "baskets", minLevel: 2, energyCost: 14, funGain: 16, xp: 12, scoreRef: 400, scoreUnit: "m", desc: "Elle court ! Touche l'écran pour sauter les obstacles et ramasser des pièces." },
  { id: "danse", label: "Danse", icon: "solar:music-notes-bold-duotone", prop: "micro", minLevel: 3, energyCost: 10, funGain: 22, xp: 11, scoreRef: 40, scoreUnit: "pts", desc: "Suis le rythme : touche les flèches au bon moment." },
  { id: "peche", label: "Pêche", icon: "solar:fish-bold-duotone", prop: "canne", minLevel: 4, energyCost: 6, funGain: 14, xp: 10, scoreRef: 8, scoreUnit: "poissons", desc: "Lance la ligne et ferre au bon moment. Parfois, un poisson rejoint le frigo !" },
];
const ACT_MAP = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

// ---------------------------------------------------------------------
// Aides
// ---------------------------------------------------------------------
export const itemById = (id) => ITEM_MAP[id] || null;
export const colorByKey = (key) => COLORS[key] || null;
export const setById = (id) => SET_MAP[id] || null;
export const ingredientById = (id) => ING_MAP[id] || null;
export const recipeById = (id) => RECIPE_MAP[id] || null;
export const propById = (id) => PROP_MAP[id] || null;
export const activityById = (id) => ACT_MAP[id] || null;

// Prix d'une couleur d'un item, selon les couleurs déjà possédées.
// - item premium : gemmes (40 % pour une couleur supplémentaire), + supplément si couleur premium
// - couleur premium d'un item normal : gemmes (prix de la couleur, majoré selon la rareté)
// - sinon : pièces, plein tarif pour la première couleur, 40 % ensuite
export function priceFor(itemId, colorKey, ownedColors = []) {
  const item = itemById(itemId);
  const color = colorByKey(colorKey);
  if (!item || !color) return { currency: "coins", amount: 0 };
  const extra = (ownedColors || []).length > 0;
  if (item.premium) {
    let amount = extra ? Math.max(1, Math.ceil(item.gemPrice * EXTRA_COLOR_RATE)) : item.gemPrice;
    if (color.premium) amount += Math.ceil(color.gems / 2);
    return { currency: "gems", amount };
  }
  if (color.premium) {
    const bump = { commun: 0, rare: 3, epique: 6, legendaire: 10 }[item.rarity] || 0;
    return { currency: "gems", amount: color.gems + bump };
  }
  return { currency: "coins", amount: extra ? Math.max(1, Math.round(item.price * EXTRA_COLOR_RATE)) : item.price };
}

// Applique une remise (0..1) à un prix
export function discounted(price, discount = 0) {
  if (!discount) return price;
  return { ...price, amount: Math.max(1, Math.round(price.amount * (1 - discount))) };
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededRandom(seedStr) {
  let seed = hash(String(seedStr));
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

export const FEATURED_DISCOUNT = 0.3;
export const SHOP_OFFERS = 6;

// Offres de la boutique pour un jour donné (même résultat pour une date et un niveau donnés).
// Renvoie { day, offers: [{ id, itemId, colors, featured, discount }], ingredients: [ids] }
// - ~6 vêtements, dont 1 « vedette » à -30 % ; quelques items jusqu'à 2 niveaux au-dessus (cadenas)
// - les items premium n'apparaissent qu'à partir du niveau 5
// - colors : couleurs mises en avant ce jour-là (toutes les couleurs de l'item restent achetables)
// - tous les ingrédients sont toujours disponibles
export function shopOffersForDay(dayKey, level = 1) {
  const rand = seededRandom(`shop:${dayKey}`);
  const lvl = Math.max(1, level || 1);
  const pool = ITEMS.filter((i) => i.minLevel <= lvl + 2 && (!i.premium || lvl >= PREMIUM_LEVEL));
  const offers = [];
  const bySlot = {};
  const picks = pool.slice();
  // au moins un item débloqué par emplacement quand c'est possible
  while (offers.length < SHOP_OFFERS && picks.length) {
    const i = Math.floor(rand() * picks.length);
    const item = picks[i];
    const slotCount = bySlot[item.slot] || 0;
    if (slotCount >= 2 && picks.some((p) => (bySlot[p.slot] || 0) < 2)) {
      // évite trop d'items du même emplacement
      if (rand() < 0.7) continue;
    }
    picks.splice(i, 1);
    bySlot[item.slot] = slotCount + 1;
    const shuffled = item.colors.slice().sort(() => rand() - 0.5);
    offers.push({ id: `${dayKey}:${item.id}`, itemId: item.id, colors: shuffled.slice(0, 3), featured: false, discount: 0 });
  }
  // à partir du niveau 5, toujours au moins un item premium (gemmes) dans la vitrine
  if (lvl >= PREMIUM_LEVEL && !offers.some((o) => itemById(o.itemId).premium)) {
    const prem = ITEMS.filter((i) => i.premium && i.minLevel <= lvl + 2);
    if (prem.length) {
      const item = prem[Math.floor(rand() * prem.length)];
      const o = { id: `${dayKey}:${item.id}`, itemId: item.id, colors: item.colors.slice(0, 3), featured: false, discount: 0 };
      if (offers.length >= SHOP_OFFERS) offers[offers.length - 1] = o; else offers.push(o);
    }
  }
  // vedette : un item débloqué (niveau atteint), de préférence pas commun
  const unlocked = offers.filter((o) => itemById(o.itemId).minLevel <= lvl);
  const candidates = unlocked.length ? unlocked : offers;
  if (candidates.length) {
    const nice = candidates.filter((o) => itemById(o.itemId).rarity !== "commun");
    const from = nice.length && rand() < 0.6 ? nice : candidates;
    const f = from[Math.floor(rand() * from.length)];
    f.featured = true; f.discount = FEATURED_DISCOUNT;
    offers.splice(offers.indexOf(f), 1);
    offers.unshift(f);
  }
  return { day: dayKey, offers, ingredients: INGREDIENTS.map((i) => i.id) };
}

// Remise du jour pour un item (0 si pas en vedette)
export function offerDiscount(shop, itemId) {
  const o = shop?.offers?.find((x) => x.itemId === itemId);
  return o?.discount || 0;
}

// Avancement d'une collection. owned = inventory.owned ({ itemId: [couleurs] })
export function setProgress(setId, owned = {}) {
  const set = setById(setId);
  if (!set) return { id: setId, have: 0, total: 0, ratio: 0, done: false, items: [] };
  const items = set.items.map((id) => ({ id, owned: (owned?.[id] || []).length > 0 }));
  const have = items.filter((i) => i.owned).length;
  return { id: setId, have, total: items.length, ratio: items.length ? have / items.length : 0, done: have === items.length && have > 0, items };
}

// Nombre de variantes (item + couleur) possédées
export function collectionCount(owned = {}) {
  let n = 0;
  for (const item of ITEMS) n += (owned?.[item.id] || []).filter((c) => item.colors.includes(c)).length;
  return n;
}

// Récompense d'une activité selon le score : 5 à 40 pièces, xp de base +50 % max
export function activityReward(activityId, score = 0) {
  const a = activityById(activityId);
  if (!a) return { coins: 0, xp: 0, ratio: 0 };
  const ratio = Math.max(0, Math.min(1, (Number(score) || 0) / a.scoreRef));
  return { coins: Math.round(5 + 35 * ratio), xp: Math.round(a.xp * (1 + 0.5 * ratio)), ratio };
}

// Ingrédients manquants pour une recette : { id: quantité manquante }
export function missingIngredients(recipeId, pantry = {}) {
  const r = recipeById(recipeId);
  const out = {};
  if (!r) return out;
  for (const [id, n] of Object.entries(r.ingredients)) {
    const have = pantry?.[id] || 0;
    if (have < n) out[id] = n - have;
  }
  return out;
}
