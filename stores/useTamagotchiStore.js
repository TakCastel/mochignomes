// stores/useTamagotchiStore.js
import { defineStore } from "pinia";
import { ref } from "vue";

// Vitesse de vie, en points par heure réelle.
// La créature vit même quand l'appli est fermée : à l'ouverture,
// on rattrape le temps écoulé depuis la dernière visite.
const RATES = {
  hunger: 6, // 75 → 0 en un peu plus de 12 h
  cleanliness: 4,
  fun: 5,
  energyAwake: 5,
  energySleeping: 20, // une bonne nuit recharge l'énergie en quelques heures
  healthStarving: 5, // perte de santé quand la faim est à 0
};
const SLEEP_FACTOR = 0.5; // pendant le sommeil, tout s'use moitié moins vite
const CATCH_UP_STEP = 60; // secondes simulées par pas de rattrapage
const MAX_CATCH_UP = 7 * 24 * 3600; // au-delà d'une semaine, on arrête de compter

// Personnalité : chaque trait va de 0 à 1 et se forme selon les soins.
// Les habitudes s'estompent doucement si on arrête (4 % par jour).
export const TRAITS = ["joueuse", "gourmande", "caline", "rancuniere", "coquette"];
const TRAIT_FADE_PER_DAY = 0.04;

// Expérience gagnée par action : elle fait monter le niveau
const XP = { nourrir: 4, laver: 4, jouer: 6, danser: 3, calin: 2, chatouiller: 1, soigner: 3 };

// Niveau atteint pour un total d'expérience, et progression vers le suivant
export function levelInfo(xp) {
  let level = 1, rest = xp, need = 40;
  while (rest >= need) { rest -= need; level++; need = 40 + 15 * (level - 1); }
  return { level, into: rest, need };
}

const freshState = () => ({
  hunger: 75, cleanliness: 75, fun: 80, energy: 100, health: 100, isSleeping: false,
});

let decayTimer = null;
let neglectedDuringDecay = false;

export const useTamagotchiStore = defineStore(
  "tamagotchi",
  () => {
    const name = ref("");

    function initName() {
      if (!name.value) {
        name.value = generateRandomName();
      }
    }

    const hunger = ref(75);
    const cleanliness = ref(75);
    const fun = ref(80);
    const energy = ref(100);
    const health = ref(100);
    const isSleeping = ref(false);
    const lastUpdate = ref(0); // horodatage (ms) du dernier calcul
    const traits = ref(Object.fromEntries(TRAITS.map((t) => [t, 0])));
    const neglectedAt = ref(0); // dernière fois qu'il a manqué de quelque chose
    const xp = ref(0);
    const bornAt = ref(0);
    const counters = ref({}); // nombre de fois que chaque chose a été faite
    const unlocked = ref([]); // succès débloqués
    const shell = ref("lavande"); // (ancienne couleur de coque, inutilisée)
    const palette = ref("printemps"); // ambiance du décor
    const ui = ref("pastel"); // thème d'interface (boutons, panneaux)
    // Visites : série de jours d'affilée et bonus du jour
    const lastVisitDay = ref("");
    const streak = ref(0);
    const pendingBonus = ref(0);
    const awaySeconds = ref(0); // durée de l'absence avant cette visite (non sauvegardée)

    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    function checkDailyVisit() {
      const today = new Date();
      const key = dayKey(today);
      if (lastVisitDay.value === key) return;
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      streak.value = lastVisitDay.value === dayKey(yesterday) ? streak.value + 1 : 1;
      lastVisitDay.value = key;
      // le bonus grandit avec la série, jusqu'à 7 jours
      pendingBonus.value = 10 + 5 * (Math.min(streak.value, 7) - 1);
    }
    function claimBonus() {
      const gained = pendingBonus.value;
      xp.value += gained;
      pendingBonus.value = 0;
      return gained;
    }
    const count = (key, n = 1) => { counters.value[key] = (counters.value[key] || 0) + n; };

    function rename(newName) {
      const clean = String(newName || "").trim().slice(0, 16);
      if (clean) name.value = clean;
    }

    // Nouvelle partie : nouvelle créature, tout repart de zéro
    function resetGame() {
      const f = freshState();
      hunger.value = f.hunger; cleanliness.value = f.cleanliness; fun.value = f.fun;
      energy.value = f.energy; health.value = f.health; isSleeping.value = f.isSleeping;
      traits.value = Object.fromEntries(TRAITS.map((t) => [t, 0]));
      neglectedAt.value = 0; xp.value = 0; counters.value = {}; unlocked.value = [];
      bornAt.value = Date.now(); lastUpdate.value = Date.now();
      name.value = generateRandomName();
    }

    // rapproche un trait de 1 (nudge) ou de 0 (soothe), sans jamais dépasser
    function nudge(trait, amount) {
      const v = traits.value[trait] || 0;
      traits.value[trait] = Math.min(1, v + amount * (1 - v));
    }
    function soothe(trait, amount) {
      traits.value[trait] = Math.max(0, (traits.value[trait] || 0) * (1 - amount));
    }

    // Boude-t-il ? Une créature rancunière boude un moment après avoir été négligée.
    function isSulking(now = Date.now()) {
      const r = traits.value.rancuniere || 0;
      if (r < 0.3 || !neglectedAt.value) return false;
      const duration = (r * 4 * 3600 * 1000) / speed.value; // jusqu'à 4 h
      return now - neglectedAt.value < duration;
    }

    // Accélérateur pour tester : ?vitesse=60 fait passer une heure par minute
    const speed = ref(1);

    function generateRandomName() {
      const prefixes = ["Mo", "Chi", "Ba", "Lu", "Ki", "Zo", "Po", "Ni"];
      const suffixes = ["mi", "chan", "bo", "ri", "nette", "ki", "zou", "pouf"];

      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

      return prefix + suffix;
    }

    function applyAction(action) {
      // Si mort, seul "soigner" est autorisé pour réanimer
      if (health.value <= 0 && action !== "soigner") return;

      // Si en train de dormir, tout est bloqué sauf "coucher" (pour réveiller) et "soigner"
      if (isSleeping.value && !["coucher", "soigner"].includes(action)) return;

      const increase = 10;
      const decrease = 2;
      const playCost = health.value > 100 ? 2 : 5;

      // Danser comme jouer : il faut un minimum d'énergie
      if (["jouer", "danser"].includes(action) && energy.value < 10) return;
      if (health.value <= 0 && action === "soigner") count("revive");
      count(action);
      xp.value += XP[action] || 0;

      // Ce que l'on fait façonne son caractère
      switch (action) {
        case "nourrir":
          nudge("gourmande", hunger.value > 85 ? 0.05 : 0.012); // trop nourrie → gourmande
          soothe("rancuniere", 0.01);
          break;
        case "laver":
          nudge("coquette", cleanliness.value > 70 ? 0.05 : 0.015); // lavée déjà propre → coquette
          soothe("rancuniere", 0.01);
          break;
        case "jouer":
          nudge("joueuse", 0.035);
          soothe("rancuniere", 0.03);
          break;
        case "chatouiller":
          nudge("caline", 0.015);
          soothe("rancuniere", 0.01);
          break;
        case "calin":
          nudge("caline", 0.025);
          soothe("rancuniere", 0.02);
          break;
        case "danser":
          nudge("joueuse", 0.015);
          soothe("rancuniere", 0.01);
          break;
        case "soigner":
          soothe("rancuniere", 0.01);
          break;
      }

      switch (action) {
        case "nourrir":
          hunger.value = Math.min(hunger.value + increase, 200);
          cleanliness.value = Math.max(cleanliness.value - decrease, 0);
          energy.value = Math.max(energy.value - decrease + 1, 0);
          break;

        case "laver":
          cleanliness.value = Math.min(cleanliness.value + increase, 100);
          break;

        case "jouer":
          fun.value = Math.min(fun.value + increase, 100);
          energy.value = Math.max(energy.value - playCost, 0);
          break;

        case "coucher":
          if (isSleeping.value) {
            isSleeping.value = false; // Réveil manuel
          } else if (energy.value < 10) {
            startSleeping();
          }
          break;

        case "soigner":
          if (health.value <= 0) {
            // Réanimation : santé et énergie de base
            health.value = 50;
            energy.value = 50;
            isSleeping.value = false;
          } else {
            health.value = Math.min(health.value + increase, 200);
          }
          break;

        case "chatouiller":
          fun.value = Math.min(fun.value + 2, 100);
          break;

        case "calin":
          fun.value = Math.min(fun.value + 4, 100);
          break;

        case "danser":
          fun.value = Math.min(fun.value + 6, 100);
          energy.value = Math.max(energy.value - 3, 0);
          break;
      }
    }

    function countPhoto() {
      count("photo");
    }
    // gestes découverts (pour n'afficher les astuces qu'au début)
    function countGesture(name) {
      count(name);
    }

    // Fait vivre la créature pendant `seconds` secondes.
    function decay(seconds) {
      if (health.value <= 0) return;
      const hours = seconds / 3600;
      const boosted = health.value > 100; // en pleine forme, tout s'use moins vite
      const wear = hours * (boosted ? 0.5 : 1) * (isSleeping.value ? SLEEP_FACTOR : 1);

      hunger.value = Math.max(hunger.value - RATES.hunger * wear, 0);
      cleanliness.value = Math.max(cleanliness.value - RATES.cleanliness * wear, 0);
      fun.value = Math.max(fun.value - RATES.fun * wear, 0);

      if (isSleeping.value) {
        energy.value = Math.min(energy.value + RATES.energySleeping * hours * (boosted ? 2 : 1), 100);
        if (energy.value >= 100) isSleeping.value = false; // Réveil automatique
      } else {
        energy.value = Math.max(energy.value - RATES.energyAwake * wear, 0);
        if (energy.value === 0) isSleeping.value = true; // Sommeil forcé
      }

      if (hunger.value === 0) {
        health.value = Math.max(health.value - RATES.healthStarving * hours, 0);
        if (health.value === 0) nudge("rancuniere", 0.25); // on l'a laissée mourir
      }

      // Négligence : manquer de quelque chose la rend rancunière
      if (hunger.value === 0 || fun.value === 0 || cleanliness.value === 0) {
        nudge("rancuniere", 0.03 * hours);
      }
      if (hunger.value < 15 || fun.value < 15 || cleanliness.value < 15) neglectedDuringDecay = true;

      // Les habitudes s'estompent
      const fade = 1 - (TRAIT_FADE_PER_DAY * hours) / 24;
      for (const t of TRAITS) traits.value[t] = (traits.value[t] || 0) * fade;
    }

    // Rattrape le temps passé depuis la dernière visite, puis continue en direct.
    function catchUp() {
      const now = Date.now();
      if (!lastUpdate.value || lastUpdate.value > now) {
        lastUpdate.value = now;
        return 0;
      }
      let elapsed = Math.min(((now - lastUpdate.value) / 1000) * speed.value, MAX_CATCH_UP);
      const total = elapsed;
      while (elapsed > 0) {
        const step = Math.min(CATCH_UP_STEP, elapsed);
        decay(step);
        elapsed -= step;
      }
      lastUpdate.value = now;
      if (neglectedDuringDecay) {
        neglectedAt.value = now;
        neglectedDuringDecay = false;
      }
      return total;
    }

    function startDecay() {
      if (!bornAt.value) bornAt.value = Date.now();
      if (decayTimer) return;
      awaySeconds.value = lastUpdate.value ? Math.max(0, (Date.now() - lastUpdate.value) / 1000) : 0;
      checkDailyVisit();
      if (typeof window !== "undefined") {
        const s = Number(new URLSearchParams(window.location.search).get("vitesse"));
        speed.value = s > 0 ? Math.min(s, 3600) : 1;
      }
      catchUp();
      decayTimer = setInterval(catchUp, 1000);
      if (typeof document !== "undefined") {
        // au retour sur l'onglet, on rattrape tout de suite
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") catchUp();
        });
      }
    }

    function startSleeping() {
      isSleeping.value = true;
    }

    function wakeUp() {
      isSleeping.value = false;
    }

    return {
      name,
      initName,
      hunger,
      cleanliness,
      fun,
      energy,
      health,
      lastUpdate,
      speed,
      traits,
      neglectedAt,
      isSulking,
      xp,
      bornAt,
      counters,
      unlocked,
      rename,
      resetGame,
      countPhoto,
      countGesture,
      shell,
      palette,
      ui,
      lastVisitDay,
      streak,
      pendingBonus,
      awaySeconds,
      claimBonus,
      applyAction,
      wakeUp,
      startSleeping,
      startDecay,
      isSleeping,
    };
  },
  {
    persist: {
      pick: ["name", "hunger", "cleanliness", "fun", "energy", "health", "isSleeping", "lastUpdate", "traits", "neglectedAt", "xp", "bornAt", "counters", "unlocked", "shell", "palette", "ui", "lastVisitDay", "streak", "pendingBonus"],
    },
  }
);
