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
// Couleurs : base (pièces) et premium (Étoiles, gagnées en jouant)
// soon:true = pas encore en V1 (masqué en boutique, non attribuable)
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
  // premium : toujours en Étoiles (jamais vendues contre de l'argent)
  or: { key: "or", label: "Or", hex: "#ffcc33", hex2: "#b8860b", premium: true, gems: 10 },
  galaxie: { key: "galaxie", label: "Galaxie", hex: "#2a1b5e", hex2: "#b06bff", premium: true, gems: 15 },
  holo: { key: "holo", label: "Holo", hex: "#c8f7ff", hex2: "#f5b8ff", premium: true, gems: 15, soon: true },
  arcenciel: { key: "arcenciel", label: "Arc-en-ciel", hex: "#ff5e5e", hex2: "#5ec8ff", premium: true, gems: 18, soon: true },
};
export const BASE_COLORS = Object.values(COLORS).filter((c) => !c.premium && !c.soon).map((c) => c.key);
export const PREMIUM_COLORS = Object.values(COLORS).filter((c) => c.premium && !c.soon).map((c) => c.key);

// Monnaies : `coins` = Pièces, `gems` = Étoiles (nom affiché ; la clé reste « gems »).
// Les Étoiles ne s'achètent pas : elles se gagnent par la maîtrise (voir MASTERY) et les sets.
export const CURRENCIES = {
  coins: { key: "coins", label: "Pièces", one: "pièce", icon: "solar:dollar-minimalistic-bold-duotone" },
  gems: { key: "gems", label: "Étoiles", one: "étoile", icon: "solar:star-bold-duotone" },
};
export const currencyLabel = (currency, n = 2) => {
  const c = CURRENCIES[currency] || CURRENCIES.coins;
  return Math.abs(n) > 1 ? c.label.toLowerCase() : c.one;
};

export const RARITIES = {
  commun: { label: "Commun", color: "#8a97a8" },
  rare: { label: "Rare", color: "#3b8ef0" },
  epique: { label: "Épique", color: "#9b5de5" },
  legendaire: { label: "Légendaire", color: "#f5a524" },
};

// Couleur supplémentaire d'un item déjà possédé : 40 % du prix
export const EXTRA_COLOR_RATE = 0.4;

// ---------------------------------------------------------------------
// Vêtements et accessoires
// ---------------------------------------------------------------------
const B = (...keys) => keys; // lisibilité
// V1 : formes rigides (~14) + hauts PEINTS dans la texture de peau (paint:true, via setSkinOverlay)
// + tutu et sweat (capuche) en 3D. Le reste est soon:true (masqué en boutique, ajouté par lots).
// premium:true = item payable seulement en Étoiles (gagnées en jouant) ; la rareté signale la difficulté.
export const ITEMS = [
  // tête
  { id: "bonnet", slot: "tete", label: "Bonnet", set: "hiver", price: 40, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "vert", "jaune", "rose", "blanc", "gris", "or") },
  { id: "casquette", slot: "tete", label: "Casquette", set: "sport", price: 45, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "noir", "blanc", "vert", "jaune") },
  { id: "chapeau-fete", slot: "tete", label: "Chapeau de fête", set: "fete", price: 30, minLevel: 1, rarity: "commun", colors: B("rose", "ciel", "jaune", "menthe", "violet", "rouge", "galaxie") },
  { id: "noeud", slot: "tete", label: "Nœud", set: "chic", price: 35, minLevel: 1, rarity: "commun", colors: B("rose", "rouge", "ciel", "blanc", "noir", "violet", "or") },
  { id: "oreilles-chat", slot: "tete", label: "Oreilles de chat", set: "fantaisie", price: 70, minLevel: 3, rarity: "rare", colors: B("noir", "blanc", "rose", "gris", "marron", "violet", "galaxie") },
  { id: "couronne", slot: "tete", label: "Couronne", set: "fete", price: 0, gemPrice: 30, premium: true, minLevel: 5, rarity: "legendaire", colors: B("or", "galaxie") },
  { id: "bob", slot: "tete", label: "Bob", set: "plage", price: 50, minLevel: 2, rarity: "commun", colors: B("jaune", "ciel", "menthe", "corail", "blanc", "marron"), soon: true },
  { id: "chapeau-paille", slot: "tete", label: "Chapeau de paille", set: "plage", price: 60, minLevel: 2, rarity: "rare", colors: B("jaune", "marron", "blanc", "corail", "or"), soon: true },
  { id: "corne-licorne", slot: "tete", label: "Corne de licorne", set: "fantaisie", price: 0, gemPrice: 30, premium: true, minLevel: 6, rarity: "epique", colors: B("blanc", "rose", "or"), soon: true },
  // yeux
  { id: "lunettes-rondes", slot: "yeux", label: "Lunettes rondes", set: "chic", price: 40, minLevel: 1, rarity: "commun", colors: B("noir", "marron", "rouge", "bleu", "rose", "or") },
  { id: "lunettes-soleil", slot: "yeux", label: "Lunettes de soleil", set: "plage", price: 55, minLevel: 2, rarity: "commun", colors: B("noir", "rouge", "ciel", "jaune", "blanc", "rose") },
  { id: "lunettes-coeur", slot: "yeux", label: "Lunettes cœur", set: "fete", price: 65, minLevel: 3, rarity: "rare", colors: B("rose", "rouge", "violet", "blanc"), soon: true },
  { id: "masque-ski", slot: "yeux", label: "Masque de ski", set: "hiver", price: 70, minLevel: 4, rarity: "rare", colors: B("bleu", "rouge", "noir", "menthe"), soon: true },
  { id: "monocle", slot: "yeux", label: "Monocle", set: "chic", price: 90, minLevel: 4, rarity: "epique", colors: B("noir", "gris", "marron", "or"), soon: true },
  // cou
  { id: "echarpe", slot: "cou", label: "Écharpe", set: "hiver", price: 35, minLevel: 1, rarity: "commun", colors: B("rouge", "vert", "bleu", "jaune", "rose", "gris", "blanc") },
  { id: "noeud-papillon", slot: "cou", label: "Nœud papillon", set: "chic", price: 45, minLevel: 2, rarity: "commun", colors: B("noir", "rouge", "bleu", "rose", "violet", "or") },
  { id: "foulard", slot: "cou", label: "Foulard", set: "plage", price: 40, minLevel: 1, rarity: "commun", colors: B("corail", "ciel", "menthe", "jaune", "rouge", "bleu"), soon: true },
  { id: "medaille", slot: "cou", label: "Médaille", set: "sport", price: 60, minLevel: 3, rarity: "rare", colors: B("jaune", "gris", "marron", "or"), soon: true },
  { id: "collier-perles", slot: "cou", label: "Collier de perles", set: "chic", price: 110, minLevel: 5, rarity: "epique", colors: B("blanc", "rose", "noir"), soon: true },
  // haut (paint:true = peint dans la texture de peau ; tutu et sweat : 3D)
  { id: "tshirt", slot: "haut", label: "T-shirt", set: null, price: 30, minLevel: 1, rarity: "commun", paint: true, colors: B("blanc", "rouge", "jaune", "vert", "bleu", "violet", "rose", "noir", "or", "galaxie") },
  { id: "maillot-foot", slot: "haut", label: "Maillot de foot", set: "sport", price: 75, minLevel: 2, rarity: "commun", paint: true, colors: B("bleu", "rouge", "vert", "jaune", "blanc", "noir", "or") },
  { id: "mariniere", slot: "haut", label: "Marinière", set: "plage", price: 70, minLevel: 2, rarity: "commun", paint: true, colors: B("bleu", "rouge", "noir", "ciel", "menthe") },
  { id: "sweat", slot: "haut", label: "Sweat à capuche", set: "hiver", price: 80, minLevel: 2, rarity: "commun", colors: B("gris", "noir", "rose", "bleu", "vert", "violet", "jaune", "galaxie") },
  { id: "tutu", slot: "haut", label: "Tutu", set: "fete", price: 85, minLevel: 3, rarity: "rare", colors: B("rose", "blanc", "violet", "ciel", "menthe", "or") },
  { id: "pull-noel", slot: "haut", label: "Pull de Noël", set: "hiver", price: 100, minLevel: 4, rarity: "rare", paint: true, colors: B("rouge", "vert", "bleu", "blanc", "or") },
  { id: "salopette", slot: "haut", label: "Salopette", set: "fantaisie", price: 90, minLevel: 3, rarity: "rare", colors: B("bleu", "rose", "jaune", "vert", "marron", "corail"), soon: true },
  { id: "smoking", slot: "haut", label: "Smoking", set: "chic", price: 140, minLevel: 6, rarity: "epique", colors: B("noir", "blanc", "bleu", "violet", "or"), soon: true },
  { id: "robe-etoiles", slot: "haut", label: "Robe étoilée", set: "fantaisie", price: 0, gemPrice: 45, premium: true, minLevel: 7, rarity: "legendaire", colors: B("galaxie", "violet", "bleu"), soon: true },
  // dos
  { id: "sac-dos", slot: "dos", label: "Sac à dos", set: "sport", price: 60, minLevel: 1, rarity: "commun", colors: B("rouge", "bleu", "vert", "jaune", "rose", "noir", "violet") },
  { id: "ballon-attache", slot: "dos", label: "Ballon attaché", set: "fete", price: 40, minLevel: 2, rarity: "commun", colors: B("rouge", "jaune", "bleu", "rose", "vert", "violet", "or") },
  { id: "cape", slot: "dos", label: "Cape", set: "fantaisie", price: 90, minLevel: 3, rarity: "rare", colors: B("rouge", "violet", "noir", "bleu", "vert", "galaxie") },
  { id: "ailes-papillon", slot: "dos", label: "Ailes de papillon", set: "fantaisie", price: 0, gemPrice: 40, premium: true, minLevel: 5, rarity: "legendaire", colors: B("rose", "ciel", "jaune", "or") },
  { id: "bouee", slot: "dos", label: "Bouée", set: "plage", price: 45, minLevel: 1, rarity: "commun", colors: B("rouge", "jaune", "rose", "ciel", "menthe"), soon: true },
  { id: "carapace", slot: "dos", label: "Carapace", set: "plage", price: 75, minLevel: 4, rarity: "rare", colors: B("vert", "marron", "menthe", "bleu", "or"), soon: true },
];
// Items disponibles en V1 (boutique, garde-robe, collection, coffre)
export const V1_ITEMS = ITEMS.filter((i) => !i.soon);
const ITEM_MAP = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const TOTAL_VARIANTS = V1_ITEMS.reduce((n, i) => n + i.colors.length, 0);

// ---------------------------------------------------------------------
// Collections (sets) et leurs récompenses (pièces + Étoiles)
// items : ce qui compte pour compléter le set (V1, gratuit : jamais d'item en Étoiles)
// bonus : items Étoiles du thème, affichés à part, hors du décompte
// ---------------------------------------------------------------------
export const SETS = [
  { id: "sport", label: "Sport", icon: "solar:football-bold-duotone", reward: { coins: 80, gems: 5 } },
  { id: "plage", label: "Plage", icon: "solar:sun-bold-duotone", reward: { coins: 80, gems: 5 } },
  { id: "hiver", label: "Hiver", icon: "solar:snowflake-bold-duotone", reward: { coins: 120, gems: 5 } },
  { id: "chic", label: "Chic", icon: "solar:crown-star-bold-duotone", reward: { coins: 90, gems: 5 } },
  { id: "fete", label: "Fête", icon: "solar:confetti-bold-duotone", reward: { coins: 120, gems: 5 } },
  { id: "fantaisie", label: "Fantaisie", icon: "solar:magic-stick-3-bold-duotone", reward: { coins: 100, gems: 5 } },
].map((s) => ({
  ...s,
  items: V1_ITEMS.filter((i) => i.set === s.id && !i.premium).map((i) => i.id),
  bonus: V1_ITEMS.filter((i) => i.set === s.id && i.premium).map((i) => i.id),
})).filter((s) => s.items.length > 0);
const SET_MAP = Object.fromEntries(SETS.map((s) => [s.id, s]));

// ---------------------------------------------------------------------
// Épicerie et recettes
// ---------------------------------------------------------------------
// V1 : 8 ingrédients (2 à 5 pièces). basic:true = en vente dès l'ouverture de l'épicerie,
// les autres arrivent avec l'épicerie complète (jour 2). soon:true = hors V1.
export const INGREDIENTS = [
  { id: "pomme", label: "Pomme", emoji: "🍎", icon: "ph:apple-logo-fill", price: 3, basic: true },
  { id: "fraise", label: "Fraise", emoji: "🍓", icon: "ph:cherries-fill", price: 4, basic: true },
  { id: "banane", label: "Banane", emoji: "🍌", icon: "ph:orange-fill", price: 3, basic: true },
  { id: "farine", label: "Farine", emoji: "🌾", icon: "ph:grains-fill", price: 2, basic: true },
  { id: "oeuf", label: "Œuf", emoji: "🥚", icon: "ph:egg-fill", price: 2, basic: true },
  { id: "lait", label: "Lait", emoji: "🥛", icon: "ph:drop-fill", price: 2, basic: true },
  { id: "fromage", label: "Fromage", emoji: "🧀", icon: "ph:cheese-fill", price: 5 },
  { id: "tomate", label: "Tomate", emoji: "🍅", icon: "ph:pepper-fill", price: 3 },
  { id: "carotte", label: "Carotte", emoji: "🥕", icon: "ph:carrot-fill", price: 3, soon: true },
  { id: "salade", label: "Salade", emoji: "🥬", icon: "ph:leaf-fill", price: 3, soon: true },
  { id: "chocolat", label: "Chocolat", emoji: "🍫", icon: "ph:cookie-fill", price: 5, soon: true },
  { id: "riz", label: "Riz", emoji: "🍚", icon: "ph:bowl-food-fill", price: 4, soon: true },
  { id: "poisson", label: "Poisson", emoji: "🐟", icon: "ph:fish-fill", price: 5, soon: true },
  { id: "miel", label: "Miel", emoji: "🍯", icon: "ph:jar-fill", price: 5, soon: true },
];
export const V1_INGREDIENTS = INGREDIENTS.filter((i) => !i.soon);
// Ingrédients en vente : de base, ou tous (épicerie complète)
export const groceryIngredients = (full = false) => V1_INGREDIENTS.filter((i) => full || i.basic);
const ING_MAP = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// effects : points ajoutés aux jauges (avant le bonus d'étoiles). Un repas apporte de l'ÉNERGIE
// (ce que « Manger » n'apporte pas) : donc plus de parties. V1 : 8 recettes, les autres soon:true.
export const RECIPES = [
  { id: "crepes", label: "Crêpes", emoji: "🥞", icon: "ph:cookie-fill", ingredients: { farine: 1, oeuf: 1, lait: 1 }, effects: { hunger: 28, fun: 10, energy: 14 }, xp: 11, minLevel: 1 },
  { id: "salade-fruits", label: "Salade de fruits", emoji: "🥗", icon: "ph:bowl-food-fill", ingredients: { pomme: 1, fraise: 1, banane: 1 }, effects: { hunger: 22, fun: 8, health: 6, energy: 10 }, xp: 8, minLevel: 1 },
  { id: "smoothie", label: "Smoothie", emoji: "🥤", icon: "ph:coffee-fill", ingredients: { banane: 1, fraise: 1, lait: 1 }, effects: { hunger: 16, fun: 6, energy: 18, health: 4 }, xp: 8, minLevel: 1 },
  { id: "omelette", label: "Omelette", emoji: "🍳", icon: "ph:egg-fill", ingredients: { oeuf: 2, fromage: 1 }, effects: { hunger: 30, energy: 14 }, xp: 9, minLevel: 2 },
  { id: "croque", label: "Croque-monsieur", emoji: "🥪", icon: "ph:bread-fill", ingredients: { farine: 1, fromage: 1 }, effects: { hunger: 32, fun: 6, energy: 12 }, xp: 11, minLevel: 2 },
  { id: "glace-fraise", label: "Glace à la fraise", emoji: "🍨", icon: "ph:ice-cream-fill", ingredients: { fraise: 2, lait: 1 }, effects: { hunger: 12, fun: 20, energy: 10 }, xp: 10, minLevel: 3 },
  { id: "pizza", label: "Pizza", emoji: "🍕", icon: "ph:pizza-fill", ingredients: { farine: 1, tomate: 1, fromage: 1 }, effects: { hunger: 38, fun: 14, energy: 16, cleanliness: -4 }, xp: 14, minLevel: 3 },
  { id: "tarte-pommes", label: "Tarte aux pommes", emoji: "🥧", icon: "ph:cake-fill", ingredients: { farine: 1, pomme: 2, oeuf: 1 }, effects: { hunger: 30, fun: 16, energy: 14 }, xp: 14, minLevel: 4 },
  { id: "soupe", label: "Soupe de légumes", emoji: "🍲", icon: "ph:bowl-steam-fill", ingredients: { carotte: 2, tomate: 1 }, effects: { hunger: 26, health: 12, energy: 10 }, xp: 10, minLevel: 2, soon: true },
  { id: "riz-cantonais", label: "Riz cantonais", emoji: "🍛", icon: "ph:bowl-food-fill", ingredients: { riz: 1, oeuf: 1, carotte: 1 }, effects: { hunger: 36, energy: 14, health: 6 }, xp: 13, minLevel: 4, soon: true },
  { id: "sushis", label: "Sushis", emoji: "🍣", icon: "ph:fish-fill", ingredients: { riz: 1, poisson: 1, salade: 1 }, effects: { hunger: 34, health: 16, energy: 12 }, xp: 18, minLevel: 6, soon: true },
  { id: "gateau-chocolat", label: "Gâteau au chocolat", emoji: "🎂", icon: "ph:cake-fill", ingredients: { farine: 1, oeuf: 2, chocolat: 1, lait: 1 }, effects: { hunger: 30, fun: 26, energy: 12 }, xp: 20, minLevel: 7, soon: true },
];
export const V1_RECIPES = RECIPES.filter((r) => !r.soon);
const RECIPE_MAP = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
// multiplicateur des effets selon la note de préparation (1 à 3 étoiles)
export const STAR_MULT = { 1: 1, 2: 1.25, 3: 1.5 };
export const starMult = (stars) => STAR_MULT[Math.max(1, Math.min(3, Math.round(Number(stars) || 1)))];

// ---------------------------------------------------------------------
// Objets d'activité et activités
// ---------------------------------------------------------------------
// Les objets V1 sont OFFERTS au déblocage de leur activité (ballon trouvé, télé, baskets) :
// `price` ne sert qu'en secours (objet perdu / partie très ancienne). Jamais d'argent réel.
export const PROPS = [
  { id: "ballon", label: "Ballon", icon: "ph:soccer-ball-fill", price: 0, minLevel: 1, activity: "foot" },
  { id: "tele", label: "Télé", icon: "ph:television-simple-fill", price: 60, minLevel: 1, activity: "tele" },
  { id: "baskets", label: "Baskets", icon: "ph:sneaker-move-fill", price: 60, minLevel: 1, activity: "course" },
  { id: "micro", label: "Micro", icon: "ph:microphone-stage-fill", price: 120, minLevel: 3, activity: "danse", soon: true },
  { id: "canne", label: "Canne à pêche", icon: "ph:fish-simple-fill", price: 110, minLevel: 4, activity: "peche", soon: true },
];
const PROP_MAP = Object.fromEntries(PROPS.map((p) => [p.id, p]));

// scoreRef : score qui donne la récompense maximale ; xp : expérience de base.
// feature : clé de déblocage dans le store principal (features). V1 = foot, course, tele.
// tele : pas de score ni d'échec (noScore), coût 0, rend de l'énergie (energyGain), ~0 pièce.
// soon:true : carte « bientôt », non jouable.
export const ACTIVITIES = [
  { id: "tele", label: "Regarder la télé", icon: "solar:tv-bold-duotone", prop: "tele", feature: "tele", minLevel: 1, energyCost: 0, energyGain: 5, funGain: 16, xp: 5, scoreRef: 1, noScore: true, coins: 0, scoreUnit: "", desc: "Un moment tout doux sur le canapé. Change de chaîne : laquelle préfère-t-elle ?" },
  { id: "foot", label: "Foot", icon: "solar:football-bold-duotone", prop: "ballon", feature: "ballon", minLevel: 1, energyCost: 10, funGain: 20, xp: 10, scoreRef: 30, scoreUnit: "jongles", desc: "Jongles, puis tirs au but dès 10 jongles : touche le ballon au bon moment !" },
  { id: "course", label: "Course", icon: "solar:running-bold-duotone", prop: "baskets", feature: "course", minLevel: 1, energyCost: 14, funGain: 16, xp: 12, scoreRef: 400, scoreUnit: "m", desc: "Elle court ! Touche pour sauter, glisse à gauche ou à droite pour changer de couloir et ramasser pièces et fruits." },
  { id: "danse", label: "Danse", icon: "solar:music-notes-bold-duotone", prop: "micro", minLevel: 3, energyCost: 10, funGain: 22, xp: 11, scoreRef: 40, scoreUnit: "pts", soon: true, desc: "Suis le rythme : touche les flèches au bon moment." },
  { id: "peche", label: "Pêche", icon: "solar:fish-bold-duotone", prop: "canne", minLevel: 4, energyCost: 6, funGain: 14, xp: 10, scoreRef: 8, scoreUnit: "poissons", soon: true, desc: "Lance la ligne et ferre au bon moment. Parfois, un poisson rejoint le frigo !" },
];
const ACT_MAP = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
export const V1_ACTIVITIES = ACTIVITIES.filter((a) => !a.soon);

// Maîtrise : les seules sources d'Étoiles (avec les sets complétés et le cadeau de découverte).
// kind "score" : meilleur score d'une activité ; "stars" : une recette réussie à 3★ ;
// "days" : jours de jeu cumulés (pas une série).
export const MASTERY = [
  { id: "jongles-30", kind: "score", activity: "foot", score: 30, gems: 5, label: "30 jongles" },
  { id: "course-400", kind: "score", activity: "course", score: 400, gems: 5, label: "400 m de course" },
  { id: "recette-3", kind: "stars", stars: 3, gems: 5, label: "Une recette réussie à 3 étoiles" },
  { id: "jours-30", kind: "days", days: 30, gems: 10, label: "30 jours de jeu" },
];
export const masteryById = (id) => MASTERY.find((m) => m.id === id) || null;
// Jours de jeu cumulés récompensés (jamais de série à protéger)
export const PLAY_DAYS_REWARDS = [
  { days: 7, coins: 50 },
  { days: 14, coins: 100 },
  { days: 30, coins: 150 }, // + Étoiles de la maîtrise « jours-30 »
];

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
// Disponible en V1 (ni item, ni couleur, ni recette, ni activité marqués soon)
export const isAvailable = (x) => !!x && !x.soon;
// Couleurs proposables d'un item (sans les couleurs soon)
export const itemColors = (itemOrId) => {
  const item = typeof itemOrId === "string" ? itemById(itemOrId) : itemOrId;
  return item ? item.colors.filter((c) => COLORS[c] && !COLORS[c].soon) : [];
};

// Prix d'une couleur d'un item, selon les couleurs déjà possédées.
// - item premium : Étoiles (40 % pour une couleur supplémentaire), + supplément si couleur premium
// - couleur premium d'un item normal : Étoiles (prix de la couleur, majoré selon la rareté)
// - sinon : pièces, plein tarif pour la première couleur, 40 % ensuite
// currency vaut "coins" (Pièces) ou "gems" (Étoiles).
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

// Boutique : le catalogue V1 débloqué est TOUJOURS achetable (cadenas de niveau seulement).
// Une seule mise en avant : le « coloris du jour » à -30 %, sans minuteur ni « dernière chance ».
export const DAILY_DISCOUNT = 0.3;

// Coloris du jour (même résultat pour une date et un niveau donnés).
// Renvoie { day, daily: { itemId, color, discount } | null, offers: [daily] (compat), ingredients: [ids] }
export function shopOffersForDay(dayKey, level = 1) {
  const rand = seededRandom(`shop:${dayKey}`);
  const lvl = Math.max(1, level || 1);
  const pool = [];
  for (const it of V1_ITEMS) {
    if (it.premium || it.minLevel > lvl) continue;
    for (const c of itemColors(it)) if (!COLORS[c].premium) pool.push([it.id, c]);
  }
  let daily = null;
  if (pool.length) {
    const [itemId, color] = pool[Math.floor(rand() * pool.length)];
    daily = { id: `${dayKey}:${itemId}:${color}`, itemId, color, colors: [color], featured: true, discount: DAILY_DISCOUNT };
  }
  return { day: dayKey, daily, offers: daily ? [daily] : [], ingredients: V1_INGREDIENTS.map((i) => i.id) };
}

// Remise du jour pour un item (et une couleur) : 0 sauf le coloris du jour
export function offerDiscount(shop, itemId, color) {
  const d = shop?.daily || shop?.offers?.[0];
  if (!d || d.itemId !== itemId) return 0;
  if (color && d.color && d.color !== color) return 0;
  return d.discount || 0;
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
  for (const item of V1_ITEMS) n += (owned?.[item.id] || []).filter((c) => item.colors.includes(c)).length;
  return n;
}

// Rendement dégressif par activité et par jour : 100 / 70 / 40 % puis 25 % (« elle préfère varier »)
export const DAILY_FALLOFF = [1, 0.7, 0.4, 0.25];
export const falloff = (playsToday = 0) => DAILY_FALLOFF[Math.min(DAILY_FALLOFF.length - 1, Math.max(0, playsToday | 0))];
// Bonus d'un nouveau record : payé en entier, jamais réduit
export const RECORD_COINS = 10;

// Récompense d'une activité selon le score et le nombre de parties déjà jouées aujourd'hui.
// Pièces : 5 à 40 au score (× dégressif) ; télé : activity.coins (0). XP : base +50 % max.
export function activityReward(activityId, score = 0, playsToday = 0) {
  const a = activityById(activityId);
  if (!a) return { coins: 0, xp: 0, ratio: 0, falloff: 1 };
  const ratio = a.noScore ? 1 : Math.max(0, Math.min(1, (Number(score) || 0) / a.scoreRef));
  const f = falloff(playsToday);
  const base = a.coins != null ? a.coins : Math.round(5 + 35 * ratio);
  return { coins: Math.round(base * f), xp: Math.round(a.xp * (1 + 0.5 * ratio)), ratio, falloff: f };
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
