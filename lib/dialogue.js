// lib/dialogue.js : ce que la créature dit, selon son stade, son caractère, son humeur et l'heure.
// Les grandes réserves de répliques vivent ici (les humeurs et réactions sont dans lib/creatureLook.js).
// {nom} = son prénom, {x} = ce qu'on lui propose.

// ---------------------------------------------------------------------
// Tirage sans répétition : on évite les dernières répliques dites
// ---------------------------------------------------------------------
const recent = [];
const RECENT_MAX = 12;
export function pick(list) {
  if (!list || !list.length) return "";
  if (list.length === 1) return list[0];
  let pool = list.filter((l) => !recent.includes(l));
  if (!pool.length) pool = list.filter((l) => l !== recent[recent.length - 1]);
  if (!pool.length) pool = list;
  const line = pool[Math.floor(Math.random() * pool.length)];
  const i = recent.indexOf(line);
  if (i >= 0) recent.splice(i, 1);
  recent.push(line);
  if (recent.length > RECENT_MAX) recent.shift();
  return line;
}

// Remplace {nom} et {x}, met une majuscule en tête
export function fill(line, vars = {}) {
  const out = String(line || "")
    .replace(/\{nom\}/g, vars.nom || "moi")
    .replace(/\{x\}/g, vars.x ?? "");
  return out.charAt(0).toUpperCase() + out.slice(1);
}
const say = (list, vars) => fill(pick(list), vars);

// « de crêpes », « d'omelette »
export const de = (word) => (/^[aeiouyhâàéèêîïôœû]/i.test(word || "") ? `d'${word}` : `de ${word}`);

// ---------------------------------------------------------------------
// Selon le stade
// ---------------------------------------------------------------------
export const BY_STAGE = {
  oeuf: ["..."],
  bebe: [
    "Gou gou !", "Ba ba ?", "Hihi !", "Areuh !", "Agaga !", "Dada !", "Mamaaa ?", "Pfrrrt !",
    "Ba-ba-ba !", "Oh ! Oh !", "Na na na !", "Bwaaa !", "Tchou tchou !", "Bleuh ?", "Areuh areuh ♥",
    "{nom} ! {nom} !", "Gaaa ♥", "Babababa...", "Oooh ?", "Hi hi hi !",
  ],
  enfant: [
    "Tu es là, youpi !", "Raconte-moi ta journée !", "Pourquoi le ciel est bleu ?",
    "Dis, les nuages, ils vont où ?", "Tu sais quoi ? ...J'ai oublié.", "C'est quoi ton animal préféré ?",
    "Quand je serai grande, je serai astronaute !", "On joue à chat ?", "Dis, pourquoi l'herbe est verte ?",
    "J'ai trouvé un caillou trop joli !", "Tu m'apprends un truc ?", "Les étoiles, c'est loin comment ?",
    "J'ai compté jusqu'à cent ! Enfin, presque.", "Regarde, une coccinelle !", "Pourquoi on peut pas voler ?",
    "On est meilleurs amis pour toujours ?", "{nom} est trop contente que tu sois là !",
    "Moi, c'est {nom}, la plus chouette du pré !", "J'ai un secret... non, je le dis pas !",
  ],
  ado: [
    "Hmm, salut.", "Tu viens faire quoi ?", "Ça va, ça va.", "Trop la flemme...", "Genre, t'es là ?",
    "C'est grave stylé ici, en vrai.", "Bon, OK, t'es cool.", "Je fais rien. Et alors ?",
    "J'suis pas d'humeur. Enfin, un peu.", "T'as vu mon style ? Non ? Pff.", "Laisse-moi, je réfléchis à la vie.",
    "En vrai, je t'aime bien. Le dis à personne.", "Ouais, ouais, je sais.", "C'est chelou, ce nuage.",
    "Wesh ! ...Je rigole.", "Franchement, t'es pas si relou.", "On se capte plus tard ? ...Non, reste.",
    "C'est pas que je m'ennuie, c'est que j'attends.", "J'ai trop grandi pour les bisous. Bon, un petit alors.",
  ],
  adulte: [
    "Je suis contente de te voir.", "Une belle journée, non ?", "Prends soin de toi, d'accord ?",
    "Tu sais, je suis fière de nous.", "Les petits moments comptent le plus.", "Merci d'être toujours là.",
    "Respire un grand coup... voilà.", "On a fait du chemin, toi et moi.", "Je me souviens quand j'étais toute petite...",
    "Tu as eu une longue journée ? Je suis là.", "Rien ne presse. On est bien.", "Je t'aime fort, tu sais.",
    "Chaque jour avec toi est un cadeau.", "Ne t'en fais pas, tout ira bien.", "Le pré est plus beau quand tu es là.",
    "Tu te souviens de mon premier « areuh » ?",
  ],
};

// ---------------------------------------------------------------------
// Selon l'heure, et le ciel du moment (lib/gameUi.js dayPhase)
// ---------------------------------------------------------------------
export const BY_TIME = {
  matin: [
    "Bonjour ! Bien dormi ?", "Coucou ! Le soleil est levé !", "Un petit-déj ?", "Debout, debout ! Nouvelle journée !",
    "J'ai fait un rêve trop bizarre cette nuit...", "Le matin, j'ai la tête en vrac.", "Bonjour toi ! On fait quoi aujourd'hui ?",
    "*bâille* Bonjour...", "Il est tôt, mais je suis contente de te voir !",
  ],
  midi: [
    "C'est bientôt l'heure de manger, non ?", "Midi ! Mon ventre a sonné.", "Le soleil est tout en haut !",
    "On déjeune ensemble ?", "Une petite pause ?", "Il fait bon à midi.",
  ],
  aprem: [
    "C'est l'heure du goûter ?", "Quel bel après-midi !", "On fait une petite balade ?",
    "L'après-midi, c'est fait pour jouer.", "Je ferais bien une petite sieste...", "Tu as passé une bonne matinée ?",
  ],
  soir: [
    "Quelle belle soirée.", "Bonsoir, toi !", "Tu as passé une bonne journée ?", "Le soir, je deviens toute calme.",
    "On mange quoi ce soir ?", "Bientôt l'heure du dodo...", "Raconte-moi ta journée !", "Un peu de tendresse avant de dormir ?",
  ],
  nuit: [
    "Il est tard, non ?", "Chut, tout le monde dort...", "Tu devrais dormir, toi aussi !", "Les étoiles sont trop belles cette nuit.",
    "Je dors pas, je repose mes yeux.", "Hou hou, c'est la chouette ?", "La nuit, le pré fait des bruits bizarres...", "Encore debout ?",
  ],
};
export const BY_SKY = {
  dawn: ["Oh, le ciel est tout rose !", "Le soleil se lève... trop joli.", "Ça sent la rosée !", "Bonjour, soleil !", "Le ciel est orange, on dirait un jus de fruits !", "Les oiseaux chantent déjà !"],
  day: ["Il fait trop beau !", "Le ciel est tout bleu !", "Le soleil me chauffe les joues.", "Regarde, un nuage en forme de lapin !", "Quel temps magnifique !", "Un petit vent tout doux..."],
  dusk: ["Le soleil va se coucher... moi aussi, bientôt.", "Le ciel devient violet !", "C'est l'heure magique.", "Regarde ces couleurs !", "Le jour dit au revoir...", "Ça sent la fin de journée."],
  night: ["Regarde toutes ces étoiles !", "La lune me fait un clin d'œil.", "J'ai vu une étoile filante ! Fais un vœu !", "La nuit est toute douce.", "Coucou la lune !", "Chut... le pré fait dodo."],
};
const timeKey = (h) => (h >= 22 || h < 6 ? "nuit" : h < 11 ? "matin" : h < 14 ? "midi" : h < 18 ? "aprem" : "soir");
const skyKey = (h) => (h >= 6 && h < 9 ? "dawn" : h >= 9 && h < 18 ? "day" : h >= 18 && h < 21 ? "dusk" : "night");

// ---------------------------------------------------------------------
// Caractère, bavardages, besoins
// ---------------------------------------------------------------------
export const BY_TRAIT = {
  caline: ["Un peu de tendresse ?", "J'ai envie d'un câlin.", "Je t'aime fort, tu sais.", "Reste avec moi encore un peu.", "Tu m'as manqué, même cinq minutes.", "Un bisou volant pour toi ! Mwah !"],
  joueuse: ["Et si on jouait ?", "J'ai une idée de jeu !", "Ballon ? Ballon ? Ballon ?", "Je m'ennuie pas, mais on pourrait jouer.", "Le dernier arrivé est une pomme pourrie !", "On fait un match ?"],
  gourmande: ["On mange quoi ce soir ?", "J'ai rêvé d'une montagne de crêpes.", "Un petit goûter, ce serait pas de refus.", "Tu sens cette odeur ? Non ? Dommage.", "Je pense à manger. Encore.", "Mon ventre a toujours une petite place."],
  coquette: ["Je suis bien coiffée ?", "Il me faudrait un nouvel accessoire.", "Tu me prends en photo ?", "Cette couleur me va bien, non ?", "Je me suis faite belle pour toi !", "Je brille, hein ?"],
  rancuniere: ["Je m'en souviendrai, hein.", "Je pardonne. Mais j'oublie pas.", "Hmm, je t'ai à l'œil.", "Aujourd'hui, ça va. On verra demain.", "C'est bien, aujourd'hui. Je note.", "Pas de bêtises, d'accord ?"],
};

export const IDLE = [
  "Tu savais que je sais siffler ? Fiouuu... non, pas encore.", "J'ai trouvé un trèfle à trois feuilles. Presque !",
  "Si j'étais un fruit, je serais une fraise.", "Je me demande à quoi rêvent les escargots.",
  "Toc toc ! ...Qui est là ? ...Moi !", "Psst ! J'ai un secret : je t'aime bien.", "J'ai fait une grimace au nuage. Il a rien dit.",
  "Tu veux une blague ? Euh... j'ai oublié la fin.", "Un papillon s'est posé sur moi tout à l'heure !", "J'aime bien quand tu passes me voir.",
  "Hmm hmm hmm ♪", "Et si on construisait une cabane ?", "J'ai compté les brins d'herbe. Y en a beaucoup.",
  "Quel est le comble pour un jardinier ? Raconter des salades ! Hihi.", "Qu'est-ce qui est jaune et qui attend ? Jonathan ! Hihi.",
  "Un escargot sur une tortue crie : « Youhou, ça décoiffe ! »", "J'ai le hoquet... hic !", "Je suis la reine du pré !",
  "On est bien, hein ?", "Un jour, j'irai voir la mer.", "Il y a une fourmi qui me fait coucou.", "Je t'ai gardé la meilleure place, à côté de moi.",
  "{nom}, c'est un joli prénom, hein ? Merci !", "Tralala, je m'ennuie pas du tout.",
];

export const NEEDS = {
  hunger: ["Mon ventre gargouille...", "J'ai un petit creux...", "Tu as quelque chose à manger ?", "Grrrou... c'est mon ventre.", "Je mangerais bien un petit truc...", "C'est l'heure de manger, non ?"],
  cleanliness: ["Je me sens toute sale.", "Un bain, s'il te plaît ?", "J'ai de la boue partout...", "Beurk, ça colle.", "Je sens pas très bon...", "Un peu de mousse ?"],
  fun: ["Je m'ennuie un peu...", "On joue ?", "Il se passe rien...", "Viens t'amuser avec moi !", "Je tourne en rond...", "Un petit jeu, dis ?"],
  energy: ["Je tombe de sommeil.", "Mes yeux se ferment...", "Un petit dodo ?", "*bâille* Pardon...", "Je suis crevée...", "J'ai plus de piles..."],
};
export const ILL = ["Atchoum... je n'ai pas la forme.", "J'ai un petit rhume.", "*renifle*", "J'ai le nez tout bouché...", "Un petit soin, s'il te plaît ?", "Atchoum ! Pardon.", "Je suis toute patraque."];
export const EXHAUSTED = ["Je suis épuisée... un peu de soin, s'il te plaît.", "Je n'ai plus de forces...", "Un petit soin, et un gros dodo...", "Je suis à plat...", "Tout doux avec moi, je suis vidée."];
export const ILL_START = ["Atchoum ! Oh non, je crois que je suis enrhumée...", "J'ai le nez qui gratte... ATCHOUM !", "Je me sens pas très bien...", "Oh non, un rhume...", "*renifle* Ça commence...", "Atch... atch... ATCHOUM !"];
export const RECOVERY = [
  "Je suis guérie ! Merci !", "Plus de rhume ! Youpi !", "Je respire par le nez ! C'est magique !", "Ah, ça va beaucoup mieux !",
  "Merci de m'avoir soignée !", "Je me sens toute neuve !", "Au revoir le rhume, bon débarras !", "Tu soignes trop bien !", "Me revoilà en pleine forme !",
];

// Elle tourne trop vite (lib/creature3d.js)
export const DIZZY = [
  "Ouh là, tout tourne !", "Wooouh !", "Pouh, j'ai le tournis !", "Le pré fait la toupie !", "Encore ! ...Non, stop !",
  "Je vois trois toi !", "Wiiiii !", "Ma tête fait des loopings !", "Oh là là, où est le haut ?", "Manège gratuit !",
  "Plus vite ! ...Non, moins vite !", "Je suis une toupie !", "Tout danse autour de moi...",
];

// Photo
export const PHOTO = ["Cheese !", "Je suis photogénique ?", "Clic clac !", "Attends, je prends la pose !", "Ouistiti !", "Tu me l'envoies ?", "Mon meilleur profil !", "Encore une !"];

// Elle grandit (le nouveau stade)
export const GROW_UP = {
  bebe: ["Areuh ! Gou gou !", "Bah ! Oh ! ♥"],
  enfant: ["Je suis plus un bébé ! Je parle trop bien maintenant !", "Regarde, j'ai grandi ! Je sais dire plein de mots !", "Hé ! Je suis une grande maintenant !", "Youpi, je grandis ! Tu m'apprends plein de choses ?"],
  ado: ["Bon. Je suis ado, maintenant. Respect.", "J'ai grandi, OK ? Plus de bisous devant tout le monde.", "Ado ! Ça veut dire que je décide, non ?", "Waouh, j'ai grandi... c'est stylé, en vrai."],
  adulte: ["Je suis adulte... Merci de m'avoir accompagnée jusqu'ici.", "J'ai fini de grandir. Grâce à toi, je suis heureuse.", "Adulte ! Mais je resterai toujours un peu ta petite boule de bonheur.", "Tu te souviens quand j'étais un œuf ? Regarde-moi maintenant !"],
};
export const growUpLine = (stage, name) => (GROW_UP[stage] ? say(GROW_UP[stage], { nom: name }) : "");

// ---------------------------------------------------------------------
// Retour après une absence (narration de la carte des retrouvailles)
// ---------------------------------------------------------------------
const AWAY = {
  ill: ["Elle a attrapé un petit rhume. Un soin, et ça ira mieux !", "Atchoum ! Un petit rhume est passé par là : un soin et ça repart.", "Elle renifle un peu : un petit soin lui ferait du bien."],
  slept: ["Elle a fait un gros dodo.", "Elle a fait une super sieste.", "Elle a dormi comme une marmotte.", "Elle s'est bien reposée, la voilà en forme !"],
  veryHungry: ["Son ventre gargouille : c'est l'heure du goûter !", "Elle a très faim : un bon repas lui ferait plaisir !", "Son ventre fait plus de bruit qu'elle !"],
  hungry: ["Elle a eu un petit creux.", "Elle grignoterait bien quelque chose.", "Elle pense déjà au prochain repas."],
  dirty: ["Elle s'est un peu salie en jouant dans le pré.", "Elle a sauté dans une flaque. Deux fois.", "Elle a des brins d'herbe partout !", "Elle a fait des roulades dans l'herbe."],
  bored: ["Elle a hâte de jouer avec toi !", "Elle a inventé un jeu et veut te le montrer !", "Elle a plein d'idées de jeux pour toi !", "Elle a envie de bouger avec toi !"],
  calm: [
    "Elle a passé un moment tout tranquille dans le pré.", "Elle t'a gardé la meilleure place au soleil.", "Elle a appris à siffler. Presque.",
    "Elle a compté les nuages : quarante-sept.", "Elle a raconté aux papillons à quel point elle t'aime.", "Elle a fait une longue sieste au soleil.",
    "Elle a joué à cache-cache avec une coccinelle.", "Elle a pensé très fort à toi.", "Elle t'a préparé plein d'histoires à raconter.",
  ],
};
// f : { ill, slept, veryHungry, hungry, dirty, bored } -> phrases
export function awayLines(f = {}) {
  const lines = [];
  for (const k of ["ill", "slept", "veryHungry", "hungry", "dirty", "bored"]) if (f[k]) lines.push(pick(AWAY[k]));
  if (!lines.length) lines.push(pick(AWAY.calm));
  return lines;
}

// ---------------------------------------------------------------------
// Activités (lib/activities/*.js). Une clé "<évènement>_bebe" l'emporte pour un bébé.
// ---------------------------------------------------------------------
export const ACTIVITY_LINES = {
  foot: {
    startLove: ["Youpi, le foot !", "Mon sport préféré !", "Envoie le ballon, je suis prête !", "Je vais tout donner !", "Ballon, ballon, ballon !"],
    startLove_bebe: ["Ballon !", "Bal-lon !", "Gaaa ! Ballon !"],
    record: ["Nouveau record !", "Record battu ! T'as vu ça ?", "Je suis une championne !", "Personne n'a jamais fait mieux !"],
    record_bebe: ["Encoooore !", "Gaaa !"],
    penalties: ["Aux tirs au but !", "À moi le but !", "Attention, gardien, j'arrive !", "On passe aux choses sérieuses !"],
    penalties_bebe: ["Tir !", "Pan !"],
    goal: ["Buuut !", "Dans la lucarne !", "Gooool !", "Et c'est le but !", "Imparable !", "Le filet tremble !"],
    goal_bebe: ["Buuut !", "Gaaa !"],
    goalLove: ["Je suis la meilleure !", "C'est moi la championne !", "Trop facile !", "Je suis faite pour ça !"],
    save: ["Il l'a arrêté... grr !", "Oh non, le gardien !", "La prochaine, il l'aura pas !", "Raté de peu !"],
    save_bebe: ["Oh...", "Bouh..."],
    miss: ["Oups !", "Pas cadré...", "Oh, à côté !", "Le vent, c'est la faute du vent !"],
    miss_bebe: ["Oups !", "Oh !"],
    retry: ["Allez, encore !", "On recommence ?", "Je vais y arriver !", "Encore une fois, s'il te plaît !"],
    retry_bebe: ["Encore !", "Encooore !"],
  },
  course: {
    startLove: ["J'adore courir !", "À vos marques... prête... partez !", "Je suis une fusée !", "Personne ne me rattrape !"],
    startLove_bebe: ["Couriiir !", "Vroum !"],
    record: ["Nouveau record !", "Plus rapide que le vent !", "Record ! Je vole !", "T'as vu comme je cours ?"],
    record_bebe: ["Vroum !", "Gaaa !"],
    tired: ["Pfiou, je suis lessivée !", "Ouf... j'ai plus de jambes !", "Pause... pause...", "Je me suis cognée, mais ça va !"],
    tired_bebe: ["Ouf...", "Bouh..."],
    timeUp: ["Quelle course !", "J'ai couru jusqu'au bout !", "Fiou, quelle endurance !", "J'ai encore des jambes, en plus !"],
    timeUp_bebe: ["Encore !", "Vroum vroum !"],
  },
  tele: {
    "dessin-anime": ["Hihi, il est rigolo !", "Encore une bêtise !", "Ha ha ha !", "Oh non, il va tomber ! ...Hihi !", "C'est mon personnage préféré !", "Il a des grandes oreilles !", "Pouet pouet !", "Qu'il est bête !"],
    nature: ["Ooh, un oiseau...", "C'est beau dehors...", "Regarde, ça vole !", "Waouh, une baleine !", "Les petits renards, trop mignons !", "Chut, on va lui faire peur...", "Moi aussi, je veux voir la mer.", "Une forêt immense !"],
    cuisine: ["Miam... j'ai faim maintenant.", "Ça sent bon jusqu'ici !", "On en fait aussi ?", "Il met beaucoup de sucre, lui !", "Oh, un gâteau à trois étages !", "Je saurais le faire, moi !", "Ça fait gargouiller mon ventre...", "Tu me fais ça, un jour ?"],
    sport: ["Allez, allez !", "Il court vite !", "Buuut ?", "Plus vite !", "Ouh, il a failli tomber !", "Allez, les bleus !", "Je pourrais faire pareil !", "Quel match !"],
    cuddle: ["On est bien là...", "Ce canapé est trop moelleux !", "Chut, ça commence !", "Je me blottis contre toi.", "Reste avec moi.", "Le meilleur moment de la journée.", "Tu me passes le coussin ?", "J'adore la télé avec toi."],
    bored: ["Bof... on zappe ?", "Pfff, c'est nul...", "On change ?", "Y a rien d'autre ?", "Zzz... oh pardon."],
    boredHint: ["Tu peux changer de chaîne ? Appuie sur la télé !", "Bof... appuie sur la télé pour zapper ?", "On change ? Appuie sur l'écran !"],
    end: ["Mmh... c'était bien.", "C'est déjà fini ?", "Une dernière ? Non ? Bon.", "J'ai les yeux tout carrés !"],
    endFav: ["C'était trop bien... on recommence demain ?", "Ma chaîne préférée, le bonheur !", "Le meilleur programme du monde !", "Merci pour ce moment télé !"],
  },
};
export function activityLine(act, event, stage) {
  const t = ACTIVITY_LINES[act] || {};
  const pool = (stage === "bebe" && t[`${event}_bebe`]) || t[event];
  return pool ? pick(pool) : "";
}

// ---------------------------------------------------------------------
// Envies (lib/wishes.js) : plusieurs façons de le dire
// ---------------------------------------------------------------------
export const WISH_TEXTS = {
  faim: ["J'ai un petit creux...", "On mange quelque chose ?", "Mon ventre réclame !", "Un petit goûter ?", "J'ai faim, j'ai faim !", "Tu me donnes à manger ?", "Grrrou... j'ai faim.", "Je mangerais bien un morceau."],
  bain: ["Je voudrais un bain !", "Un peu de mousse ?", "Plouf plouf ?", "Je me sens toute sale...", "On prend un bain ?", "J'ai envie de bulles !", "Un bon bain moussant ?"],
  jeu: ["On joue ensemble ?", "Tu joues avec moi ?", "J'ai envie de jouer !", "On s'amuse un peu ?", "Un petit jeu ?", "Viens jouer, viens !", "Je m'ennuie... on joue ?"],
  calin: ["Un peu de tendresse ?", "Tu me fais un câlin ?", "J'ai besoin d'un peu de tendresse...", "Tu m'aimes un peu ?", "J'ai envie d'un câlin.", "Un petit moment tendresse ?", "Viens près de moi ?"],
  chatouille: ["Fais-moi rire !", "Poke-moi !", "Fais-moi un petit poke !", "Appuie sur moi, pour voir ?", "Un poke ? Hihi !", "J'ai envie de rigoler !", "Poke, poke ?"],
  danse: ["J'ai envie de danser !", "On danse ?", "Un peu de musique ?", "Ça te dit, une petite danse ?", "Mes pieds veulent danser !", "♪ On danse ? ♪"],
  dodo: ["Je commence à avoir sommeil...", "Un petit dodo ?", "*bâille* Je suis fatiguée...", "Tu me mets au lit ?", "Mes yeux se ferment...", "J'irais bien faire une sieste."],
};
export const WISH_ACTIVITY = {
  foot: ["Tu me fais une passe ?", "On joue au ballon ?", "Un petit foot ?", "Je parie que je marque !", "Ballon ? Ballon !", "On fait des jongles ?"],
  course: ["On va courir ?", "Une petite course ?", "Je mets mes baskets ?", "Le premier arrivé a gagné !", "J'ai envie de courir !"],
  tele: ["On regarde la télé ensemble ?", "Un petit dessin animé ?", "Canapé et télé ?", "On se pose devant la télé ?", "Il y a quoi à la télé ?"],
};
const WISH_MEAL = ["J'ai envie {de} !", "{x}, ça te dit ?", "Je rêve {de}...", "Miam, {x}... on en fait ?", "Hmm, {x}... j'en salive !", "Et si on mangeait un peu {de} ?"];
const WISH_MEAL_FAV = ["{x} ? C'est mon plat préféré, tu sais !", "Mon plat préféré... {x} ! Tu m'en fais ?", "J'ai trop envie {de}, mon plat préféré !", "{x}, s'il te plaît ! C'est mon préféré."];
export function wishMealText(label, fav = false) {
  const x = String(label || "").toLowerCase();
  return fill(pick(fav ? WISH_MEAL_FAV : WISH_MEAL).replace("{de}", de(x)), { x });
}
const WISH_OUTFIT = ["Je mettrais bien {mon} {x} !", "Et si je mettais {mon} {x} ?", "J'ai envie de porter {mon} {x} !", "Tu m'aides à mettre {mon} {x} ?", "{mon} {x} me manque !"];
// possessif selon l'objet (« mon bonnet », « ma casquette », « mes lunettes »)
const FEM = new Set(["casquette", "couronne", "mariniere", "cape", "salopette", "robe-etoiles", "medaille", "bouee", "carapace", "corne-licorne"]);
const possOf = (id, label) => (/^(lunettes|oreilles|ailes|baskets)/i.test(label || "") ? "mes" : FEM.has(id) && !/^[aeiouhé]/i.test(label || "") ? "ma" : "mon");
export function wishOutfitText(id, label) {
  const x = String(label || "").toLowerCase();
  return fill(pick(WISH_OUTFIT).replace("{mon}", possOf(id, x)), { x });
}

// ---------------------------------------------------------------------
// Réactions à ses goûts (lib/tastes.js), selon le stade. {x} = ce qu'on lui propose.
// kind : "color" | "food" | "activity" | "channel" | "item" ; les répliques "<mood>:<kind>"
// s'ajoutent (en double) à celles de "<mood>".
// ---------------------------------------------------------------------
export const REACTIONS_BY_STAGE = {
  bebe: {
    love: ["Gaaa ! ♥", "Ouiii ! {x} !", "Hihi ! Encore !", "Aaah ! ♥♥", "Wouaaa !", "Gou gou ♥ !", "Oh ! Oh ! ♥", "Areuh ♥ !"],
    "love:food": ["Miam miam ! ♥", "Gnam gnam !", "Encooore !"],
    like: ["Gou gou !", "Hihi !", "Ba ba ♥", "Oh !", "Areuh !", "Hihihi !"],
    "like:food": ["Gnam !", "Miam !"],
    meh: ["Ba ?", "Gou ?", "Hmm ?", "Bah.", "Euh ?"],
    dislike: ["Bwa...", "Beuh..."], // un bébé aime tout : ne sert qu'en secours
  },
  enfant: {
    love: ["J'ADORE {x} !", "C'est mon préféré !", "Trop bien, {x} !", "Ouiii ! C'est trop génial !", "Tu te souviens que j'adore ça ? Merci !", "Le meilleur jour de ma vie !", "Waouh ! Merci, merci, merci !", "C'est exactement ce que je voulais !"],
    "love:food": ["{x} ! C'est mon plat préféré !", "Miam, {x} ! Tu te souviens que j'adore ça ?", "Je pourrais en manger tous les jours !", "Encore, encore ! J'adore !", "Mmmh ! Le meilleur plat du monde !"],
    "love:item": ["Je suis trop belle avec {x} !", "Regarde-moi ! {x} !", "Je garde ça pour toujours !", "Trop jolie ! Tu me prends en photo ?"],
    "love:color": ["Du {x} ! Ma couleur préférée !", "Le {x}, c'est la plus belle couleur du monde !", "Waouh, tout {x} !"],
    "love:activity": ["Ouiii, {x} ! Mon activité préférée !", "J'adore trop ça !", "On en refait une après ?"],
    "love:channel": ["Ma chaîne préférée !", "Chut, c'est mon émission !", "Ouiii, {x} ! Je regarde tout !"],
    like: ["Chouette !", "C'est bien, ça !", "Cool !", "Sympa !", "J'aime bien !", "Pas mal du tout !", "Merci !"],
    meh: ["D'accord.", "Ok !", "Si tu veux.", "Bah, pourquoi pas.", "Mouais, ça va.", "Hmm, d'accord."],
    dislike: ["Beurk...", "J'aime pas trop ça.", "Pas ça...", "Bof bof...", "Oh non...", "C'est pas mon truc...", "Je préférerais autre chose..."],
    "dislike:food": ["Beurk, {x}... je mange juste un peu.", "Pas ça... bon, une bouchée.", "Bleurk ! Pardon, mais j'aime pas.", "Je me bouche le nez et j'avale !"],
    "dislike:item": ["Ça me gratte, ce truc !", "Je ressemble à rien avec ça...", "On l'enlève vite ?"],
    "dislike:color": ["Pas le {x}... c'est moche.", "Le {x}, j'aime vraiment pas."],
  },
  ado: {
    love: ["Ok... j'avoue, {x}, c'est cool.", "Ça, c'est stylé.", "Pas mal du tout !", "Trop bien. Enfin, je veux dire... c'est cool.", "Là, tu gères.", "Ok, tu marques des points.", "Franchement ? J'adore.", "C'est grave bien !"],
    "love:item": ["Là, je suis grave stylée.", "{x} ? Validé.", "Je suis trop fraîche avec ça.", "Faut que tout le pré me voie !"],
    "love:food": ["{x} ! Ok, là tu m'as eue.", "Trop bon, sérieux.", "Je vais pas faire semblant : j'adore."],
    "love:color": ["Le {x}, c'est ma couleur. Point.", "Du {x} ? Tu me connais trop."],
    "love:activity": ["{x} ? Let's go !", "Ça, c'est mon kif.", "Ok, là je suis motivée."],
    "love:channel": ["Chut, c'est trop bien là.", "Mon émission ! Personne ne zappe."],
    like: ["Ouais, pourquoi pas.", "Ça passe.", "C'est pas mal.", "Ok, sympa.", "Ça me va.", "Bon, c'est cool."],
    meh: ["Mouais.", "Si tu veux.", "Bof.", "Ok. Et ?", "Ça m'est égal.", "Hmm."],
    dislike: ["Sérieux ?", "Non mais... {x} ?", "Tu rigoles, j'espère.", "La honte...", "Nan, nan, nan.", "Genre, sérieux ?", "Trop pas."],
    "dislike:item": ["Sérieux ? {x} ?", "Personne ne doit me voir comme ça.", "Si quelqu'un prend une photo, je déménage."],
    "dislike:food": ["{x} ? Sérieux ?", "Beurk. Mais genre, vraiment beurk."],
  },
  adulte: {
    love: ["Oh, {x} ! Tu me connais si bien.", "Mon préféré, merci !", "Quel bonheur !", "Tu as pensé à moi... merci, vraiment.", "C'est parfait. Merci, du fond du cœur.", "Tu me gâtes !", "Rien ne me fait plus plaisir.", "Oh, merci ! J'adore."],
    "love:food": ["{x} ! Mon petit plaisir.", "Tu m'as préparé ça ? Merci !", "Ça me rappelle quand j'étais petite...", "Le goût du bonheur."],
    "love:item": ["Je me sens élégante.", "{x}... c'est tout moi.", "Merci, j'adore cette tenue."],
    "love:color": ["Le {x}... ma couleur depuis toujours.", "Du {x} ! Tu as bon goût."],
    "love:activity": ["{x} ! Rien de tel pour se sentir bien.", "J'adore ce moment avec toi."],
    "love:channel": ["Mon émission préférée, installons-nous.", "Oh, j'adore celle-là."],
    like: ["C'est gentil, merci.", "Très bien.", "Avec plaisir.", "C'est agréable.", "Merci, c'est sympa.", "J'apprécie."],
    meh: ["Merci.", "D'accord.", "Pourquoi pas.", "Hmm, très bien.", "Ça ira."],
    dislike: ["Je ne suis pas très fan, je crois...", "Hmm, ce n'est pas trop mon truc.", "Je vais faire un effort.", "On peut essayer autre chose ?", "Ce n'est pas mon préféré, mais merci.", "Disons que... non."],
    "dislike:food": ["Je mange un peu, pour te faire plaisir.", "{x}... ce n'est vraiment pas mon plat."],
    "dislike:item": ["Ce n'est pas vraiment mon style...", "Je préfère sans, je crois."],
  },
};

export function reactionLine(stage, mood, kind, label = "", traits = {}) {
  const table = REACTIONS_BY_STAGE[stage] || REACTIONS_BY_STAGE.enfant;
  const specific = table[`${mood}:${kind}`] || [];
  let pool = [...specific, ...specific, ...(table[mood] || REACTIONS_BY_STAGE.enfant[mood] || ["..."])];
  if (mood === "love" && kind === "food" && traits.gourmande > 0.5 && stage !== "bebe") pool = [...pool, "Je pourrais en manger tous les jours !", "Encore une part ? Pour la route !"];
  if (mood === "love" && kind === "item" && traits.coquette > 0.5 && stage !== "bebe") pool = [...pool, "Je suis la plus belle du pré !", "Photo ! Tout de suite !"];
  return fill(pick(pool), { x: label });
}

// ---------------------------------------------------------------------
// Petites phrases
// ---------------------------------------------------------------------
const NEED_MOODS = new Set(["morte", "endormie", "malade", "fatiguee", "triste", "affamee", "cracra", "grognon", "boudeuse"]);
const TRAIT_KEYS = Object.keys(BY_TRAIT);

// Bavardage de fond (bulle 3D) : humeur, mêlée de stade / heure / ciel / caractère quand tout va bien.
// moodLines = MESSAGES de lib/creatureLook.js pour l'humeur affichée.
export function idleLine(store, mood, moodLines = []) {
  const vars = { nom: store?.name };
  const stage = store?.stage || "bebe";
  if (stage === "oeuf") return "";
  if (stage === "bebe" && mood !== "endormie" && Math.random() < 0.6) return say(BY_STAGE.bebe, vars);
  if (NEED_MOODS.has(mood) || !moodLines.length) return moodLines.length ? say(moodLines, vars) : say(BY_STAGE[stage] || IDLE, vars);
  const h = new Date().getHours();
  const t = store?.traits || {};
  const r = Math.random();
  if (r < 0.35) return say(moodLines, vars);
  if (r < 0.55) return say(BY_STAGE[stage] || BY_STAGE.enfant, vars);
  if (r < 0.68) return say(BY_TIME[timeKey(h)], vars);
  if (r < 0.76) return say(BY_SKY[skyKey(h)], vars);
  const marked = TRAIT_KEYS.filter((k) => (t[k] || 0) > 0.5);
  if (r < 0.86 && marked.length) return say(BY_TRAIT[marked[Math.floor(Math.random() * marked.length)]], vars);
  return say(IDLE, vars);
}

// Bulle de pensée (components/WishBubble.vue)
export function lineFor(store, ctx = {}) {
  const vars = { nom: store?.name };
  if (ctx.action && WISH_TEXTS[ctx.action]) return say(WISH_TEXTS[ctx.action], vars);
  if (store.exhausted) return say(EXHAUSTED, vars);
  if (store.illness) return say(ILL, vars);
  if (store.isSleeping) return "Zzz...";
  if (store.hunger < 25) return say(NEEDS.hunger, vars);
  if (store.cleanliness < 25) return say(NEEDS.cleanliness, vars);
  if (store.fun < 25) return say(NEEDS.fun, vars);
  if (store.energy < 20) return say(NEEDS.energy, vars);
  const h = new Date().getHours();
  const t = store.traits || {};
  const stage = store.stage || "bebe";
  if (stage === "bebe" || !BY_STAGE[stage]) return say(BY_STAGE.bebe, vars);
  const pool = [...BY_STAGE[stage], ...BY_STAGE[stage], ...BY_TIME[timeKey(h)], ...BY_SKY[skyKey(h)], ...IDLE];
  for (const k of TRAIT_KEYS) if ((t[k] || 0) > 0.5) pool.push(...BY_TRAIT[k], ...BY_TRAIT[k]);
  return say(pool, vars);
}
