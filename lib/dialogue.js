// lib/dialogue.js : ce que la créature dit, selon son stade, son caractère, son humeur et l'heure
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const BY_ACTION = {
  nourrir: ["Miam, merci !", "Délicieux !", "J'adore !"],
  laver: ["Tout propre !", "Ça sent bon !", "Plouf, merci !"],
  jouer: ["On s'amuse bien !", "Encore, encore !", "Haha, c'est super !"],
  danser: ["Regarde mes pas !", "Je danse, je danse !"],
  calin: ["Coucou à toi aussi !", "Hihi, coucou !", "Coucou, ça me fait plaisir !"],
  chatouiller: ["Hihi !", "Trop rigolo !"],
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

// Réactions à ses goûts (lib/tastes.js), selon le stade. {x} = ce qu'on lui propose.
// kind : "color" | "food" | "activity" | "channel" | "item" ; une clé "<mood>:<kind>" l'emporte sur "<mood>".
export const REACTIONS_BY_STAGE = {
  bebe: {
    love: ["Gaaa ! ♥", "Ouiii ! {x} !", "Hihi ! Encore !"],
    like: ["Gou gou !", "Hihi !", "Ba ba ♥"],
    meh: ["Ba ?", "Gou ?"],
    dislike: ["Bwa..."], // un bébé aime tout : ne sert qu'en secours
  },
  enfant: {
    love: ["J'ADORE {x} !", "C'est mon préféré !", "Trop bien, {x} !"],
    "love:food": ["Des {x} ! Mes préférés !", "Miam, {x} ! Tu te souviens que j'adore ça ?"],
    "love:item": ["Je suis trop belle avec {x} !", "Regarde-moi ! {x} !"],
    like: ["Chouette !", "C'est bien, ça !"],
    meh: ["D'accord.", "Ok !"],
    dislike: ["Beurk...", "J'aime pas trop, {x}.", "Pas ça..."],
    "dislike:food": ["Beurk, {x}... je mange juste un peu.", "Pas des {x}..."],
  },
  ado: {
    love: ["Ok... j'avoue, {x}, c'est cool.", "Ça, c'est stylé.", "Pas mal du tout !"],
    "love:item": ["Là, je suis grave stylée.", "{x} ? Validé."],
    like: ["Ouais, pourquoi pas.", "Ça passe."],
    meh: ["Mouais.", "Si tu veux."],
    dislike: ["Sérieux ?", "Non mais... {x} ?", "Tu rigoles, j'espère."],
    "dislike:item": ["Sérieux ? {x} ?", "Personne ne doit me voir comme ça."],
  },
  adulte: {
    love: ["Oh, {x} ! Tu me connais si bien.", "Mon préféré, merci !", "Quel bonheur !"],
    "love:food": ["Mes {x} ! Je les attendais.", "Tu m'as fait des {x} ? Merci !"],
    like: ["C'est gentil, merci.", "Très bien."],
    meh: ["Merci.", "D'accord."],
    dislike: ["Je ne suis pas fan de {x}...", "Hmm, ce n'est pas trop mon truc."],
  },
};

export function reactionLine(stage, mood, kind, label = "", traits = {}) {
  const table = REACTIONS_BY_STAGE[stage] || REACTIONS_BY_STAGE.enfant;
  let pool = table[`${mood}:${kind}`] || table[mood] || REACTIONS_BY_STAGE.enfant[mood] || ["..."];
  if (mood === "love" && kind === "food" && traits.gourmande > 0.5 && stage !== "bebe") pool = [...pool, "Je pourrais en manger tous les jours !"];
  if (mood === "love" && kind === "item" && traits.coquette > 0.5 && stage !== "bebe") pool = [...pool, "Je suis la plus belle du pré !"];
  const line = pick(pool).replace("{x}", label);
  return line.charAt(0).toUpperCase() + line.slice(1);
}

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
  if (t.caline > 0.5) pool.push("Tu me fais un petit coucou ?");
  if (t.joueuse > 0.5) pool.push("Et si on jouait ?");
  if (t.gourmande > 0.5) pool.push("On mange quoi ce soir ?");
  if (t.coquette > 0.5) pool.push("Je suis bien coiffée ?");
  return pick(pool);
}
