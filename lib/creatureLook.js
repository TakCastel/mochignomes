// lib/creatureLook.js
// Traduit l'état du jeu (jauges, sommeil) en apparence pour le modèle 3D :
// une humeur (visage + posture) et un morphing continu du corps.

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Déformations continues : elles suivent les jauges en douceur
export function morphFromStats(s) {
  const slumpTired = s.energy < 40 ? (40 - s.energy) / 40 : 0;
  const slumpSad = s.fun < 30 ? (30 - s.fun) / 30 : 0;
  return {
    belly: clamp01((s.hunger - 100) / 70),
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
};

export const MESSAGES = {
  morte: ["...", "C'est fini pour moi...", "Oskour..."],
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
};

export function moodFromStats(s) {
  if (s.health <= 0) return "morte";
  if (s.isSleeping) return "endormie";
  if (s.health < 30) return "malade";
  if (s.energy < 30) return "fatiguee";

  const low = { hunger: s.hunger < 50, cleanliness: s.cleanliness < 50, fun: s.fun < 50 };
  const lowCount = Object.values(low).filter(Boolean).length;
  if (lowCount >= 2) return "triste";
  if (lowCount === 1) {
    if (low.hunger) return "affamee";
    if (low.cleanliness) return "cracra";
    return "grognon";
  }
  if (s.hunger > 100) return "bienmangee";
  if (s.health > 100) return "musclee";
  if (s.hunger > 70 && s.cleanliness > 70 && s.fun > 70) return "heureuse";
  return "sereine";
}

// Réactions brèves quand on appuie sur une action (elles passent par-dessus l'humeur)
export const REACTIONS = {
  nourrir: { duration: 1800, look: { eyes: "arc", brows: "none", mouth: "open", extras: ["blush"] }, hop: 0.2, say: ["Miam !", "Crunch crunch !", "Délicieux !"] },
  laver:   { duration: 1800, look: { eyes: "squint", brows: "none", mouth: "laugh", extras: ["sweat"], motion: "shake" }, say: ["Ça mousse !", "Hihi, ça gratte !", "Tout propre !"] },
  jouer:   { duration: 2200, look: { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"], arms: "up", motion: "dance" }, hop: 0.35, say: ["Encore !", "Trop drôle !", "Youpi !"] },
  soigner: { duration: 1600, look: { eyes: "squint", brows: "sad", mouth: "teeth", extras: ["sweat"] }, say: ["Aïe !", "Ça pique...", "Merci docteur !"] },
  reveil:  { duration: 1600, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up" }, say: ["Hein ?!", "Déjà le matin ?", "*bâille*"] },
  coucher: { duration: 0, say: ["Bonne nuit...", "*bâille*", "Zzz..."] },
  revivre: { duration: 2200, look: { eyes: "wide", brows: "raised", mouth: "o", arms: "up", extras: ["sweat"] }, hop: 0.3, say: ["Je suis vivante !", "Ouf !", "Qu'est-ce qui s'est passé ?"] },
};

export const POKE_MESSAGES = ["Hihi, ça chatouille !", "Hé !", "Encore !", "Arrête, hihi !"];

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
