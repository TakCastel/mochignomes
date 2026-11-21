// lib/creatureLook.js
// Traduit l'état du jeu (jauges, sommeil) en apparence pour le modèle 3D :
// une humeur (visage + posture) et un morphing continu du corps.

import { pick } from "~/lib/dialogue";

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
  morte: ["Soigne-moi...", "Une piqûre, vite...", "Oskour...", "Je vois des étoiles...", "Un petit soin, s'il te plaît...", "J'ai plus de piles...", "Au secours... tout doux...", "Aide-moi à me relever..."],
  endormie: ["Zzz...", "*ronfle bruyamment*", "Rronn... pich !", "Zzz... des crêpes... zzz...", "Mmh... encore cinq minutes...", "*marmonne* ...le ballon...", "Rrr... pschhh...", "Zzz... je t'aime... zzz...", "*bave un peu sur l'oreiller*", "Mmmh... pas l'heure...", "Zzz... je vole... zzz...", "*petit ronflement*"],
  malade: ["J'suis pas bien...", "Docteur...?", "Tout tourne...", "Atchoum !", "*renifle* J'ai le nez qui coule...", "J'ai la tête toute lourde...", "Tu restes près de moi ?", "Atch... atch... ATCHOUM !", "Un petit sirop, peut-être ?", "J'ai des frissons partout...", "Je fais pas semblant, promis...", "Pfff, la vie de malade..."],
  fatiguee: ["J'ai envie de dormir...", "Bonne nuit ?", "Je pique du nez...", "*bâille* Pardon...", "Mes yeux se ferment tout seuls...", "Un petit dodo, ça te dit ?", "Je suis toute molle...", "Je compte les moutons... un... deux...", "Mon lit m'appelle...", "J'ai plus de batterie...", "Juste une sieste, promis.", "Zz... non, je dors pas !"],
  triste: ["*soupir*", "Personne m'aime...", "La vie est dure...", "Snif...", "Tu m'aimes encore ?", "J'ai le cafard...", "Même les nuages sont tristes...", "Un petit sourire, pour moi ?", "Snif... ça va passer...", "J'ai besoin de toi, là.", "Tout va de travers aujourd'hui...", "Je boude pas, je suis triste. C'est pas pareil."],
  affamee: ["J'ai faim...", "Un p'tit goûter ?", "Mon ventre gargouille...", "Grrrouu... c'était mon ventre.", "Je mangerais un éléphant !", "On passe à table ?", "J'ai un trou dans le ventre !", "Miam ? Non ? Toujours rien ?", "Je sens une odeur de crêpes... ou je rêve ?", "Mon ventre fait des bruits bizarres...", "Un petit quelque chose à grignoter ?", "J'ai faiiiim !"],
  cracra: ["Beurk, ça colle !", "Un bain vite !", "*renifle* ouhlala...", "Je sens la vieille chaussette...", "J'ai de la boue partout !", "Il y a une mouche qui me suit...", "Un peu de mousse, s'il te plaît !", "Je crois que j'ai de l'herbe dans les oreilles.", "Plouf plouf ? Dis oui !", "Je suis toute crado !", "Même moi, je me trouve sale."],
  grognon: ["Grrr...", "Occupe-toi de moi !", "Suis pas contente !", "Hmpf !", "Je fais la tête.", "Pff, rien ne va !", "C'est nul aujourd'hui.", "Je m'ennuie, je m'ennuie, je m'ennuiiie !", "Grmbl...", "Laisse-moi râler un peu.", "Fais quelque chose, n'importe quoi !", "Hé ho, je suis là, moi !"],
  bienmangee: ["J'ai trop mangé...", "*rot* Oups !", "C'était délicieux !", "Mon ventre est tout rond !", "Plus une miette !", "Je vais rouler jusqu'au lit...", "Miam, merci le chef !", "Une petite sieste digestive ?", "*rot* ...Pardon !", "Je crois que je vais éclater.", "Ah, la belle vie !", "Encore un dessert ? Non, je rigole."],
  musclee: ["Regarde mes biscotos !", "Je me sens invincible !", "Prête pour l'aventure !", "Je pourrais soulever un arbre !", "Force et courage !", "Tu veux faire un bras de fer ?", "Rien ne m'arrête !", "Je suis en super forme !", "Une course ? Je te bats !", "Pleine d'énergie !", "Hop, hop, hop, je saute partout !"],
  heureuse: ["Hihi !", "J'suis trop bien là !", "Ça c'est la belle vie !", "Je suis contente que tu sois là !", "Quelle belle journée !", "La la la !", "Je t'aime fort !", "Tout est parfait !", "Youpi, youpi !", "J'ai envie de chanter !", "T'es ma personne préférée !", "Je suis heureuse, c'est tout.", "Le pré est trop joli aujourd'hui !", "Wouhou !"],
  sereine: ["La vie est douce.", "On fait quoi ?", "Coucou toi !", "Tranquille...", "Je regarde les nuages passer.", "C'est calme, j'aime bien.", "Tu as passé une bonne journée ?", "Hmm hmm hmm...", "On est bien, là.", "Raconte-moi un truc !", "Ça sent bon l'herbe.", "J'écoute les oiseaux."],
  boudeuse: ["Hmpf.", "Je te parle plus.", "T'étais où, hein ?", "J'ai pas oublié.", "Hmpf, je réfléchis.", "Je boude. Ça se voit pas ?", "Même pas je te regarde.", "Bon... peut-être un petit peu.", "C'est pas toi que je regarde, c'est l'arbre.", "Tu crois que c'est si facile ?", "Je boude encore un tout petit peu.", "Pff."],
  enjouee: ["On joue ?", "Allez, viens jouer !", "J'ai trop d'énergie !", "Chat perché !", "Un, deux, trois... soleil !", "Je parie que tu m'attrapes pas !", "On fait la course ?", "J'ai une idée de jeu !", "Hop, hop, on bouge !", "Cache-cache ? Je compte !", "Je tiens plus en place !", "Allez, allez, allez !"],
  affectueuse: ["Je t'aime fort !", "Un câlin ?", "T'es ma personne préférée !", "Je suis contente que tu sois là !", "Un peu de tendresse ?", "Tu m'as manqué, tu sais.", "Reste encore un peu ?", "Avec toi, tout est mieux.", "Je t'aime gros comme le pré !", "On est une super équipe, toi et moi.", "Mon cœur fait boum boum !", "Merci d'être là.", "Bisou volant ! Mwah !"],
  gourmande: ["Y a quoi à manger ?", "Un petit goûter ?", "J'ai une petite faim...", "Je pense à des crêpes. Tout le temps.", "C'est l'heure du goûter, non ?", "Il reste du dessert ?", "Mmmh, j'ai senti une odeur de gâteau.", "Une fraise, juste une ?", "Je pourrais grignoter un petit truc...", "On cuisine ensemble ?", "Le chocolat, c'est un légume ?", "Mon ventre a toujours de la place."],
  coquette: ["Je suis belle, non ?", "Regarde comme je brille !", "Pas une tache !", "Tu as vu ma tenue ?", "Je suis bien coiffée ?", "Miroir, mon beau miroir...", "Photo ! Photo !", "Je brille comme une étoile.", "La plus jolie du pré, c'est moi.", "Il me faudrait un nouvel accessoire...", "Je prends la pose !", "Élégance et fraîcheur !"],
  mefiante: ["Je t'ai à l'œil.", "Mouais...", "J'ai pas oublié.", "Hmm, on verra...", "Tu prépares quoi, là ?", "Je te surveille...", "Pas si vite.", "Hmm... vraiment ?", "Faut voir.", "Je reste sur mes gardes.", "Bon. On verra bien.", "Prouve-le !"],
};

// Trait le plus marqué, s'il l'est assez
export function dominantTrait(traits = {}, threshold = 0.4) {
  let best = null, value = threshold;
  for (const [t, v] of Object.entries(traits)) if (v >= value) { best = t; value = v; }
  return best;
}

const TRAIT_MOOD = { joueuse: "enjouee", caline: "affectueuse", gourmande: "gourmande", coquette: "coquette", rancuniere: "mefiante" };

export function moodFromStats(s, traits = {}, sulking = false) {
  if (s.health <= 0 || s.exhausted) return s.isSleeping ? "endormie" : "fatiguee";
  if (s.illness) return s.isSleeping ? "endormie" : "malade";
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

export const POKE_MESSAGES = [
  "Hihi !", "Hé !", "Encore !", "Trop rigolo !", "Poke !", "Hihi, ça chatouille !", "Arrête, hihi !", "Re-poke ? Vas-y !",
  "Boing !", "Hé ho !", "Pouet !", "Qui m'a pokée ?", "Ha ha ha !", "Encore un petit poke ?", "Coucou, c'est moi !", "Bip bip !",
  "Ouh, surprise !", "Tu m'as eue !", "Hihihi, stop... non, continue !", "Pokéééé !", "Je suis pas un bouton ! ...Hihi, si.",
  "Toc toc !", "Ça, c'était un super poke !", "Hop !", "Pouic !",
];

// Réactions brèves quand on appuie sur une action (elles passent par-dessus l'humeur)
export const REACTIONS = {
  nourrir: { duration: 1800, look: { eyes: "arc", brows: "none", mouth: "open", extras: ["blush"] }, hop: 0.2, say: ["Miam !", "Crunch crunch !", "Délicieux !", "Miam miam miam !", "Trop bon !", "Merci, j'avais faim !", "Slurp !", "Encore une bouchée ?", "Mmmh, c'est bon ça !", "Nom nom nom !", "Le chef mérite une étoile !", "Mon ventre dit merci !", "*mâche avec bonheur*"] },
  laver:   { duration: 1800, look: { eyes: "squint", brows: "none", mouth: "laugh", extras: ["sweat"], motion: "shake" }, say: ["Ça mousse !", "Hihi, ça gratte !", "Tout propre !", "Plouf !", "Des bulles partout !", "Je sens la fraise !", "Splash ! Hihi !", "Brille, brille !", "Pas dans les yeux !", "Frotte, frotte !", "Je suis toute neuve !", "Ça sent trop bon !", "Blub blub..."] },
  jouer:   { duration: 2200, look: { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"], arms: "up", motion: "dance" }, hop: 0.35, say: ["Encore !", "Trop drôle !", "Youpi !", "Attrape !", "Je t'ai eu !", "C'est moi la plus forte !", "Haha, encore une fois !", "Wouhou !", "Tu joues trop bien !", "On s'amuse trop !", "Encore, encore, encore !", "Ha ha ! Raté !", "Le meilleur moment de la journée !"] },
  soigner: { duration: 1600, look: { eyes: "squint", brows: "sad", mouth: "teeth", extras: ["sweat"] }, say: ["Aïe !", "Ça pique...", "Merci docteur !", "Ouille... mais ça va mieux.", "Même pas mal ! ...Bon, un peu.", "Je suis courageuse !", "Ça sent le médicament...", "Ah, je revis !", "Merci de prendre soin de moi.", "Un pansement en cœur ?", "C'était pas si terrible.", "Je me sens déjà mieux !"] },
  reveil:  { duration: 1600, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up" }, say: ["Hein ?!", "Déjà le matin ?", "*bâille*", "Mmh... coucou...", "Je rêvais de toi !", "Bonjour, bonjour !", "Qui a éteint la nuit ?", "*s'étire* Aaah !", "J'ai bien dormi !", "Encore cinq minutes...", "Tu étais là ? Coucou !", "Quel rêve ! Il y avait des crêpes partout."] },
  coucher: { duration: 0, say: ["Bonne nuit...", "*bâille*", "Zzz...", "Tu me bordes ?", "Fais de beaux rêves !", "À demain...", "Bonne nuit, je t'aime fort...", "Je ferme les yeux... juste un peu...", "Tu laisses une petite lumière ?", "Dodo, l'enfant do...", "Je vais rêver de toi.", "Chut... je m'endors..."] },
  danser:  { duration: 2600, look: { eyes: "arc", brows: "none", mouth: "grin", extras: ["blush"], arms: "up", motion: "dance" }, say: ["♪ La la la ♪", "Regarde-moi danser !", "Ça groove !", "♪ Tchic tchic boum ♪", "À gauche, à droite !", "Je suis une star !", "Allez, danse avec moi !", "Un petit tour sur moi-même !", "♪ Dou bi dou wa ♪", "Mes pieds bougent tout seuls !", "Et on lève les bras !", "Disco !"] },
  calin:   { duration: 2200, look: { eyes: "heart", brows: "none", mouth: "smile", extras: ["blush", "hearts"], arms: "hug", motion: "sway" }, hop: 0.15, say: ["Je t'aime fort !", "Oh, de la tendresse... j'adore.", "Hmmm, tout doux...", "Encore un peu ?", "Ça me fait chaud au cœur.", "Reste un peu.", "T'es ma personne préférée !", "Mon cœur fait boum boum !", "Je suis bien, là, avec toi.", "Tu m'as manqué !", "Un câlin, le meilleur des cadeaux.", "Je t'aime gros comme le ciel !", "Mwah ! Bisou volant !", "Merci d'être là."] },
  niveau:  { duration: 2400, look: { eyes: "star", brows: "raised", mouth: "grin", extras: ["blush"], arms: "up", motion: "dance" }, hop: 0.4, say: ["Je grandis !", "Niveau supérieur !", "Youhou !", "J'ai pris un niveau !", "Tu as vu ? Je progresse !", "Encore plus forte !", "Grâce à toi !", "Je me sens grandir !", "Yesss !", "Un niveau de plus, trop bien !", "On fait une super équipe !"] },
  bouderie: { duration: 1600, look: { eyes: "flat", brows: "angry", mouth: "pout", extras: [], gaze: [-0.8, 0] }, say: ["Hmpf.", "C'est pas ça qui va m'amadouer.", "...bon, merci quand même.", "T'étais où, hein ?", "Je boude encore.", "Mouais.", "Même pas je regarde.", "Hmpf... c'est gentil, mais je boude.", "Faudra plus que ça !", "Un peu de tendresse d'abord.", "J'ai pas oublié.", "...d'accord, un peu."] },
  chatouiller: { duration: 1200, look: { eyes: "squint", brows: "raised", mouth: "laugh", extras: ["blush"], motion: "shake" }, hop: 0.15, say: POKE_MESSAGES },
  // réactions à ses goûts (lib/tastes.js) : la réplique précise arrive juste après
  adore:   { duration: 2400, look: { eyes: "heart", brows: "raised", mouth: "laugh", extras: ["blush", "hearts"], arms: "up", motion: "hop" }, hop: 0.35, say: ["♥ !", "Ooh !", "Waouh !", "Oh oui !"] },
  aime:    { duration: 1600, look: { eyes: "arc", brows: "none", mouth: "smile", extras: ["blush"] }, hop: 0.15, say: ["Chouette !", "Cool !", "Sympa !", "Oh, chouette !"] },
  deteste: { duration: 2000, look: { eyes: "flat", brows: "angry", mouth: "pout", extras: [], gaze: [-0.8, 0] }, say: ["Hmpf.", "Beurk.", "Bof...", "Hmm..."] },
  revivre: { duration: 2200, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up", extras: ["sweat"] }, hop: 0.3, say: ["Je suis vivante !", "Ouf !", "Qu'est-ce qui s'est passé ?", "Je reviens de loin !", "Merci, tu m'as sauvée !", "Où je suis ? Ah, chez moi !", "Plus jamais ça !", "Je me sens toute neuve !", "Me revoilà !"] },
  // retour après une absence (components/AwayCard.vue)
  retrouvailles: { duration: 2400, look: { eyes: "heart", brows: "raised", mouth: "laugh", extras: ["blush", "hearts"], arms: "up", motion: "hop" }, hop: 0.35, say: ["Te revoilà ! Tu m'as manqué !", "Coucou ! Je suis trop contente !", "Youpi, t'es là !", "Tu m'as manqué gros comme ça !", "Coucou ! Je t'aime fort !", "Ah, te voilà ! Raconte tout !", "T'étais où, hein ? ...Bon, je suis contente quand même !", "Je savais que tu reviendrais !", "Quelle bonne surprise !", "Viens, j'ai plein de trucs à te raconter !", "Coucou toi ! Le pré était moins joli sans toi.", "Te revoilà ! On fait quoi ?"] },
};

// tirage sans répéter les dernières répliques (lib/dialogue.js)
export { pick };

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
  affectueuse: ["Affectueuse", "#ee4d6a"],
  gourmande: ["Gourmande", "#f59e0b"],
  coquette: ["Coquette", "#3b82f6"],
  mefiante: ["Méfiante", "#8b5cf6"],
};

// Petit visage affiché à côté du nom, selon l'humeur
export const MOOD_ICONS = {
  morte: "solar:confounded-circle-bold-duotone", endormie: "solar:sleeping-circle-bold-duotone", malade: "solar:thermometer-bold-duotone",
  fatiguee: "solar:sleeping-circle-bold-duotone", triste: "solar:sad-circle-bold-duotone", affamee: "solar:donut-bitten-bold-duotone",
  cracra: "solar:bath-bold-duotone", grognon: "solar:confounded-circle-bold-duotone", bienmangee: "solar:smile-circle-bold-duotone",
  musclee: "solar:dumbbell-small-bold-duotone", heureuse: "solar:smile-circle-bold-duotone", sereine: "solar:smile-circle-bold-duotone",
  boudeuse: "solar:confounded-circle-bold-duotone", enjouee: "solar:emoji-funny-circle-bold-duotone", affectueuse: "solar:heart-bold-duotone",
  gourmande: "solar:donut-bitten-bold-duotone", coquette: "solar:stars-bold-duotone", mefiante: "solar:sad-circle-bold-duotone",
};
