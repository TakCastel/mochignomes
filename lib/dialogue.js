// lib/dialogue.js : ce que la créature dit, selon son stade, son caractère, son humeur et l'heure
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BY_ACTION = {
  nourrir: ["Miam, merci !", "Délicieux !", "J'adore !"],
  laver: ["Tout propre !", "Ça sent bon !", "Plouf, merci !"],
  jouer: ["On s'amuse bien !", "Encore, encore !", "Haha, c'est super !"],
  danser: ["Regarde mes pas !", "Je danse, je danse !"],
  calin: ["Oh, un câlin...", "Je t'aime fort.", "Reste un peu."],
  chatouiller: ["Hihi, ça chatouille !", "Arrête, hihi !"],
  soigner: ["Je me sens mieux.", "Merci de t'occuper de moi."],
  coucher: ["Bonne nuit...", "Zzz..."],
};

const BY_STAGE = {
  oeuf: ["..."],
  bebe: ["Gou gou !", "Ba ba ?", "Hihi !"],
  enfant: ["Tu es là, youpi !", "Raconte-moi ta journée !"],
  ado: ["Hmm, salut.", "Tu viens faire quoi ?", "Ça va, ça va."],
  adulte: ["Je suis contente de te voir.", "Une belle journée, non ?"],
};

export function lineFor(store, ctx = {}) {
  if (ctx.action && BY_ACTION[ctx.action]) {
    const t = store.traits || {};
    if (ctx.action === "nourrir" && t.gourmande > 0.5) return pick(["Encore un peu ? Allez !", "Miam miam miam !"]);
    if (ctx.action === "laver" && t.coquette > 0.5) return pick(["Je suis la plus belle !", "Brille, brille !"]);
    return pick(BY_ACTION[ctx.action]);
  }
  if (store.exhausted) return "Je suis épuisée... un peu de soin, s'il te plaît.";
  if (store.illness) return pick(["Atchoum... je n'ai pas la forme.", "J'ai un petit rhume."]);
  if (store.isSleeping) return "Zzz...";
  const h = new Date().getHours();
  if (store.hunger < 25) return "Mon ventre gargouille...";
  if (store.cleanliness < 25) return "Je me sens toute sale.";
  if (store.fun < 25) return "Je m'ennuie un peu...";
  if (store.energy < 20) return "Je tombe de sommeil.";
  const t = store.traits || {};
  const pool = [...(BY_STAGE[store.stage] || BY_STAGE.bebe)];
  if (h >= 22 || h < 6) pool.push("Il est tard, non ?");
  else if (h < 11) pool.push("Bonjour ! Bien dormi ?");
  else if (h >= 18) pool.push("Quelle belle soirée.");
  if (t.caline > 0.5) pool.push("J'ai envie d'un câlin.");
  if (t.joueuse > 0.5) pool.push("Et si on jouait ?");
  if (t.gourmande > 0.5) pool.push("On mange quoi ce soir ?");
  if (t.coquette > 0.5) pool.push("Je suis bien coiffée ?");
  return pick(pool);
}
