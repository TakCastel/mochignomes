// lib/creatureLook.js
// Traduit l'état du jeu (jauges, sommeil) en apparence pour le modèle 3D :
// une humeur (visage + posture) et un morphing continu du corps.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Déformations continues : elles suivent les jauges en douceur
export function morphFromStats(s, traits = {}) {
  // une gourmande prend du ventre plus vite
  const bellyStart = 100 - 25 * (traits.gourmande || 0);
  const slumpTired = s.energy < 40 ? (40 - s.energy) / 40 : 0;
  const slumpSad = s.fun < 30 ? (30 - s.fun) / 30 : 0;
  return {
    belly: clamp01((s.hunger - bellyStart) / 70),
    muscle: clamp01((s.health - 100) / 70),
    slump: clamp01(slumpTired * 0.8 + slumpSad * 0.35),
    sick: s.health > 0 && s.health < 30 ? clamp01((30 - s.health) / 25) : 0,
    dirt: clamp01((50 - s.cleanliness) / 45),
    dead: s.health <= 0 ? 1 : 0,
  };
}

// Humeurs : chaque humeur choisit visage, posture, bras et mouvement.
// `image` sert de secours quand l'appareil ne sait pas afficher la 3D.
export const MOODS = {
  morte:      { image: "morte",      eyes: "x",      brows: "none",    mouth: "flat",    extras: ["halo"],          posture: "back",  arms: "hang", motion: "calm" },
  endormie:   { image: "endormie",   eyes: "closed", brows: "none",    mouth: "o",       extras: ["blush", "zzz"],  posture: "side",  arms: "rest", motion: "snore" },
  malade:     { image: "malade",     eyes: "spiral", brows: "sad",     mouth: "wavy",    extras: ["sweat"],         posture: "sit",   arms: "hang", motion: "shake" },
  fatiguee:   { image: "fatiguee",   eyes: "tired",  brows: "none",    mouth: "o",       extras: [],                posture: "sit",   arms: "hang", motion: "sway" },
  triste:     { image: "triste",     eyes: "dot",    brows: "sad",     mouth: "frown",   extras: ["tear"],          posture: "stand", arms: "hang", motion: "sway" },
  affamee:    { image: "grognon",    eyes: "shiny",  brows: "sad",     mouth: "o",       extras: [],                posture: "stand", arms: "hug",  motion: "calm" },
  cracra:     { image: "cracra",     eyes: "squint", brows: "none",    mouth: "tongue",  extras: [],                posture: "stand", arms: "rest", motion: "calm" },
  grognon:    { image: "grognon",    eyes: "dot",    brows: "angry",   mouth: "pout",    extras: ["blush"],         posture: "stand", arms: "hips", motion: "calm" },
  bienmangee: { image: "bienmangee", eyes: "arc",    brows: "none",    mouth: "content", extras: ["blush"],         posture: "sit",   arms: "rest", motion: "calm" },
  musclee:    { image: "musclee",    eyes: "arc",    brows: "none",    mouth: "grin",    extras: ["blush"],         posture: "stand", arms: "flex", motion: "calm" },
  heureuse:   { image: "heureuse",   eyes: "arc",    brows: "none",    mouth: "laugh",   extras: ["blush"],         posture: "stand", arms: "rest", motion: "hop" },
  sereine:    { image: "heureuse",   eyes: "dot",    brows: "neutral", mouth: "smile",   extras: [],                posture: "stand", arms: "rest", motion: "calm" },
  // humeurs liées au caractère
  boudeuse:   { image: "grognon",    eyes: "flat",   brows: "angry",   mouth: "pout",    extras: [],                posture: "sit",   arms: "hang", motion: "calm", gaze: [-0.8, 0] },
  enjouee:    { image: "heureuse",   eyes: "arc",    brows: "none",    mouth: "grin",    extras: ["blush"],         posture: "stand", arms: "up",   motion: "dance" },
  affectueuse:{ image: "heureuse",   eyes: "heart",  brows: "none",    mouth: "smile",   extras: ["blush", "hearts"], posture: "stand", arms: "hug", motion: "sway" },
  gourmande:  { image: "bienmangee", eyes: "shiny",  brows: "none",    mouth: "tongue",  extras: ["blush"],         posture: "stand", arms: "rest", motion: "calm" },
  coquette:   { image: "heureuse",   eyes: "dot",    brows: "skeptic", mouth: "smirk",   extras: ["blush"],         posture: "stand", arms: "hips", motion: "calm", gaze: [0.5, -0.2] },
  mefiante:   { image: "grognon",    eyes: "dot",    brows: "skeptic", mouth: "flat",    extras: [],                posture: "stand", arms: "hips", motion: "calm", gaze: [0.6, 0] },
};

export const MESSAGES = {
  morte: ["Soigne-moi...", "Une piqûre, vite...", "Oskour..."],
  endormie: ["Zzz...", "*ronfle bruyamment*", "Rronn... pich !"],
  malade: ["J'suis pas bien...", "Docteur...?", "Tout tourne..."],
  fatiguee: ["J'ai envie de dormir...", "Bonne nuit ?", "Je pique du nez..."],
  triste: ["*soupir*", "Personne m'aime...", "La vie est dure..."],
  affamee: ["J'ai faim...", "Un p'tit goûter ?", "Mon ventre gargouille..."],
  cracra: ["Beurk, ça colle !", "Un bain vite !", "*renifle* ouhlala..."],
  grognon: ["Grrr...", "Occupe-toi de moi !", "Suis pas contente !"],
  bienmangee: ["J'ai trop mangé...", "*rot* Oups !", "C'était délicieux !"],
  musclee: ["Regarde mes biscotos !", "Je me sens invincible !", "Prête pour l'aventure !"],
  heureuse: ["Hihi !", "J'suis trop bien là !", "Ça c'est la belle vie !"],
  sereine: ["La vie est douce.", "On fait quoi ?", "Coucou toi !"],
  boudeuse: ["Hmpf.", "Je te parle plus.", "T'étais où, hein ?"],
  enjouee: ["On joue ?", "Allez, viens jouer !", "J'ai trop d'énergie !"],
  affectueuse: ["Je t'aime fort !", "Un câlin ?", "T'es mon préféré !"],
  gourmande: ["Y a quoi à manger ?", "Un petit goûter ?", "J'ai une petite faim..."],
  coquette: ["Je suis belle, non ?", "Regarde comme je brille !", "Pas une tache !"],
  mefiante: ["Je t'ai à l'œil.", "Mouais...", "J'ai pas oublié."],
};

// Trait le plus marqué, s'il l'est assez
export function dominantTrait(traits = {}, threshold = 0.4) {
  let best = null, value = threshold;
  for (const [t, v] of Object.entries(traits)) if (v >= value) { best = t; value = v; }
  return best;
}

const TRAIT_MOOD = { joueuse: "enjouee", caline: "affectueuse", gourmande: "gourmande", coquette: "coquette", rancuniere: "mefiante" };

export function moodFromStats(s, traits = {}, sulking = false) {
  if (s.health <= 0) return "morte";
  if (s.isSleeping) return "endormie";
  if (s.health < 30) return "malade";
  if (s.energy < 30) return "fatiguee";
  if (sulking) return "boudeuse";

  // une gourmande réclame plus tôt, une coquette se trouve sale plus tôt
  const low = {
    hunger: s.hunger < 50 + 15 * (traits.gourmande || 0),
    cleanliness: s.cleanliness < 50 + 20 * (traits.coquette || 0),
    fun: s.fun < 50 + 10 * (traits.joueuse || 0),
  };
  const lowCount = Object.values(low).filter(Boolean).length;
  if (lowCount >= 2) return "triste";
  if (lowCount === 1) {
    if (low.hunger) return "affamee";
    if (low.cleanliness) return "cracra";
    return "grognon";
  }
  if (s.hunger > 100) return "bienmangee";
  if (s.health > 100) return "musclee";
  // quand tout va bien, le caractère s'exprime
  const happy = s.hunger > 70 && s.cleanliness > 70 && s.fun > 70;
  const trait = dominantTrait(traits, happy ? 0.4 : 0.55);
  if (trait && (trait !== "rancuniere" || !happy)) return TRAIT_MOOD[trait];
  return happy ? "heureuse" : "sereine";
}

// Réactions brèves quand on appuie sur une action (elles passent par-dessus l'humeur)
export const REACTIONS = {
  nourrir: { duration: 1800, look: { eyes: "arc", brows: "none", mouth: "open", extras: ["blush"] }, hop: 0.2, say: ["Miam !", "Crunch crunch !", "Délicieux !"] },
  laver:   { duration: 1800, look: { eyes: "squint", brows: "none", mouth: "laugh", extras: ["sweat"], motion: "shake" }, say: ["Ça mousse !", "Hihi, ça gratte !", "Tout propre !"] },
  jouer:   { duration: 2200, look: { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"], arms: "up", motion: "dance" }, hop: 0.35, say: ["Encore !", "Trop drôle !", "Youpi !"] },
  soigner: { duration: 1600, look: { eyes: "squint", brows: "sad", mouth: "teeth", extras: ["sweat"] }, say: ["Aïe !", "Ça pique...", "Merci docteur !"] },
  reveil:  { duration: 1600, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up" }, say: ["Hein ?!", "Déjà le matin ?", "*bâille*"] },
  coucher: { duration: 0, say: ["Bonne nuit...", "*bâille*", "Zzz..."] },
  danser:  { duration: 2600, look: { eyes: "arc", brows: "none", mouth: "grin", extras: ["blush"], arms: "up", motion: "dance" }, say: ["♪ La la la ♪", "Regarde-moi danser !", "Ça groove !"] },
  calin:   { duration: 2200, look: { eyes: "heart", brows: "none", mouth: "smile", extras: ["blush", "hearts"], arms: "hug", motion: "sway" }, hop: 0.15, say: ["Je t'aime fort !", "Câlin !", "Hmmm, tout doux..."] },
  niveau:  { duration: 2400, look: { eyes: "star", brows: "raised", mouth: "grin", extras: ["blush"], arms: "up", motion: "dance" }, hop: 0.4, say: ["Je grandis !", "Niveau supérieur !", "Youhou !"] },
  bouderie: { duration: 1600, look: { eyes: "flat", brows: "angry", mouth: "pout", extras: [], gaze: [-0.8, 0] }, say: ["Hmpf.", "C'est pas ça qui va m'amadouer.", "...bon, merci quand même."] },
  revivre: { duration: 2200, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up", extras: ["sweat"] }, hop: 0.3, say: ["Je suis vivante !", "Ouf !", "Qu'est-ce qui s'est passé ?"] },
};

export const POKE_MESSAGES = ["Hihi, ça chatouille !", "Hé !", "Encore !", "Arrête, hihi !"];

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Nom affiché de chaque humeur, et sa couleur de pastille
export const MOOD_LABELS = {
  morte: ["K.O.", "#9a8f8a"],
  endormie: ["Fait dodo", "#7b7fe0"],
  malade: ["Malade", "#9aa36a"],
  fatiguee: ["Fatiguée", "#a58bd8"],
  triste: ["Triste", "#5aa2e0"],
  affamee: ["A faim", "#ff9f1c"],
  cracra: ["Cracra", "#a07a4a"],
  grognon: ["Grognon", "#ef6a4a"],
  bienmangee: ["Repue", "#ffb347"],
  musclee: ["En forme", "#ff6b6b"],
  heureuse: ["Heureuse", "#3ccf6e"],
  sereine: ["Sereine", "#4fc3a1"],
  boudeuse: ["Boude", "#8b5cf6"],
  enjouee: ["Enjouée", "#22c55e"],
  affectueuse: ["Câline", "#ee4d6a"],
  gourmande: ["Gourmande", "#f59e0b"],
  coquette: ["Coquette", "#3b82f6"],
  mefiante: ["Méfiante", "#8b5cf6"],
};

// Petit visage affiché à côté du nom, selon l'humeur
export const MOOD_ICONS = {
  morte: "ph:smiley-x-eyes-fill", endormie: "ph:moon-fill", malade: "ph:smiley-melting-fill",
  fatiguee: "ph:smiley-meh-fill", triste: "ph:smiley-sad-fill", affamee: "ph:smiley-nervous-fill",
  cracra: "ph:smiley-sticker-fill", grognon: "ph:smiley-angry-fill", bienmangee: "ph:smiley-fill",
  musclee: "ph:barbell-fill", heureuse: "ph:smiley-fill", sereine: "ph:smiley-fill",
  boudeuse: "ph:smiley-angry-fill", enjouee: "ph:smiley-wink-fill", affectueuse: "ph:heart-fill",
  gourmande: "ph:cookie-fill", coquette: "ph:sparkle-fill", mefiante: "ph:smiley-meh-fill",
};
