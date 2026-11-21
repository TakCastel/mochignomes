// stores/useTamagotchiStore.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { gameToast, gameSay, gameCommand } from "~/composables/useCreatureMood";
import { dayPhase } from "~/lib/gameUi";
import { STAGE_ORDER, PAGE_UNLOCK_LEVEL, ACTION_UNLOCK_LEVEL, FEATURES, FEATURE_KEYS, stageFor, nextStage, stageDef } from "~/lib/growth";
import { pickWish } from "~/lib/wishes";
import { awayLines } from "~/lib/dialogue";
import { questsForDay, QUEST_BONUS } from "~/lib/quests";
import { migrateSnapshot, SCHEMA } from "~/lib/migrate";
import { appearanceFor, ORIGINAL_APPEARANCE } from "~/lib/appearance";
import { useInventoryStore } from "~/stores/useInventoryStore";
import {
  activityById, activityReward, recipeById, starMult, MASTERY, masteryById, PLAY_DAYS_REWARDS, RECORD_COINS,
  V1_ACTIVITIES, V1_RECIPES, SLOTS,
} from "~/lib/catalog";
import { tastesFor, reaction as tasteReaction } from "~/lib/tastes";
import { activeActivity } from "~/composables/useLiveCreature";

// Vitesse de vie, en points par heure réelle.
// La créature vit même quand l'appli est fermée : à l'ouverture,
// on rattrape le temps écoulé depuis la dernière visite.
const RATES = {
  hunger: 6,
  cleanliness: 4,
  fun: 5,
  energyAwake: 5,
  energySleeping: 20,
  healthStarving: 5, // perte de santé quand la faim est à 0
  illness: 3, // perte de santé quand elle est malade
  regen: 2, // regain de santé quand tout va bien
};
const SLEEP_FACTOR = 0.5; // pendant le sommeil, tout s'use moitié moins vite
const CATCH_UP_STEP = 60; // secondes simulées par pas de rattrapage
const MAX_CATCH_UP = 7 * 24 * 3600; // au-delà d'une semaine, on arrête de compter
const AWAY_MIN = 300; // à partir de 5 minutes d'absence, on raconte ce qui s'est passé
const OFFLINE_HEALTH_FLOOR = 5; // hors ligne, la santé ne descend jamais sous 5
const EARLY_MS = 15 * 60000; // première session : tout va plus vite
const EARLY_COOLDOWN = 0.3;
const DAY_MS = 86400000;

// Recharges de base (ms)
const COOLDOWNS = { nourrir: 20000, laver: 20000, jouer: 15000, danser: 15000, calin: 8000, soigner: 30000, coucher: 0, chatouiller: 0 };
export const ACTIONS = Object.keys(COOLDOWNS);

// Personnalité : chaque trait va de 0 à 1 et se forme selon les soins.
export const TRAITS = ["joueuse", "gourmande", "caline", "rancuniere", "coquette"];
const TRAIT_FADE_PER_DAY = 0.04;

// Expérience gagnée par action utile
const XP = { nourrir: 4, laver: 4, jouer: 6, danser: 3, calin: 2, chatouiller: 1, soigner: 3, coucher: 2 };

export function levelInfo(xp) {
  let level = 1, rest = xp, need = 40;
  while (rest >= need) { rest -= need; level++; need = 40 + 15 * (level - 1); }
  return { level, into: rest, need };
}

const SURPRISES = [
  { icon: "solar:gift-bold-duotone", text: "Elle t'a gardé un petit galet brillant." },
  { icon: "solar:star-bold-duotone", text: "Elle a trouvé une étoile pendant ton absence." },
  { icon: "solar:leaf-bold-duotone", text: "Elle a cueilli une feuille pour toi." },
  { icon: "solar:sparkles-bold-duotone", text: "Elle a fait un joli dessin avec ton prénom." },
];

// ---------- La maison : plusieurs créatures, une seule dans le pré ----------
// Le store garde à plat la créature ACTIVE (celle du pré). Les autres se reposent « au chaud » :
// leurs champs PER_CREATURE_KEYS sont rangés dans `roster` (un nid chacune), avec leur tenue
// (inventory.outfit) et leurs goûts découverts (inventory.stats.tastesSeen), échangés au changement.
//
// PROPRE À CHAQUE CRÉATURE : nom, jauges, sommeil, caractère, niveau / xp, stade, éclosion et
// tutoriel, apparence, goûts (tasteSeed + goûts révélés), compteurs, journal, envies, maladie,
// recharges, bonus de repas, tenue portée, photos (composables/useGallery.js), portrait.
// GLOBAL (le joueur) : le Sac (pièces, Étoiles, vêtements possédés, frigo, plats, objets),
// collection, records et maîtrises (inventory.stats.best : ce sont les records du joueur, ils
// rapportent des Étoiles une seule fois), nouveautés débloquées (features), jours de jeu,
// série, défis du jour, bonus du jour, parties du jour (rendement dégressif : changer de
// créature ne remet pas les compteurs à zéro), succès de l'Album, palette, temps de jeu.
export const PER_CREATURE_KEYS = [
  "name", "hunger", "cleanliness", "fun", "energy", "health", "isSleeping", "lastUpdate", "traits",
  "neglectedAt", "xp", "bornAt", "counters", "hatched", "eggHeat", "onboardStep", "hatchedAt", "stage",
  "cooldowns", "wish", "wishesDone", "illness", "exhausted", "journal", "nextWishAt", "lastWishId",
  "surpriseLog", "tasteSeed", "mealBoostUntil", "appearance",
];
// Places dans la maison : elles s'ouvrent en jouant, jamais en payant.
// Une place s'ouvre au premier des deux critères atteint : le niveau de N'IMPORTE quelle
// créature, ou les jours de jeu cumulés (totalDays, global). Places dans l'ordre.
export const SLOT_RULES = [
  null, // place 1 : la première créature
  { level: 8, days: 5 },
  { level: 15, days: 14 },
];
export const MAX_SLOTS = SLOT_RULES.length;
// Au repos (pas dans le pré), elle vit au ralenti : usure à 25 % de la vitesse normale,
// jamais malade, aucune jauge ne descend sous 30 (si elle était au-dessus), la santé ne
// baisse jamais et le temps de repos ne compte pas comme une négligence (ni rancune).
// Son âge, lui, avance normalement (elle grandit aussi en se reposant).
export const REST_FACTOR = 0.25;
export const REST_FLOOR = 30;
const REST_TALK_MIN = 10 * 60; // au-delà de 10 min de repos, elle raconte sa sieste

const generateRandomName = () => {
  const prefixes = ["Mo", "Chi", "Ba", "Lu", "Ki", "Zo", "Po", "Ni"];
  const suffixes = ["mi", "chan", "bo", "ri", "nette", "ki", "zou", "pouf"];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)];
};
// Une créature toute neuve : un œuf à faire éclore
function freshCreatureData(now = Date.now()) {
  return {
    name: generateRandomName(), hunger: 75, cleanliness: 75, fun: 80, energy: 100, health: 100,
    isSleeping: false, lastUpdate: now, traits: Object.fromEntries(TRAITS.map((t) => [t, 0])),
    neglectedAt: 0, xp: 0, bornAt: now, counters: {}, hatched: false, eggHeat: 0, onboardStep: 0,
    hatchedAt: 0, stage: "oeuf", cooldowns: {}, wish: null, wishesDone: 0, illness: null, exhausted: false,
    journal: [], nextWishAt: 0, lastWishId: "", surpriseLog: { day: "", n: 0 }, tasteSeed: "",
    mealBoostUntil: 0, appearance: null,
  };
}
const clone = (v) => (v == null || typeof v !== "object" ? v : JSON.parse(JSON.stringify(v)));
const newCreatureId = () => `c${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// Pièces gagnées : activités (au score), envies exaucées, défis, records, niveaux.
// Rien pour tendresse, fou rire (chatouiller), soigner : la récompense, c'est sa réaction.
const LEVEL_COINS = 25; // à chaque niveau
const WISH_COINS = 5; // envie de soin exaucée
const OWNED_WISH_COINS = 10; // envie de plat, d'activité ou de tenue exaucée
const CARE_COINS = { nourrir: [1, 3], laver: [1, 3], jouer: [1, 3], danser: [1, 2] };
const RETURN_GIFT_COINS = 20; // retour après une pause : un cadeau, sans culpabiliser
const MEAL_BOOST_MS = 30 * 60000; // après un bon repas : +20 % d'amusement aux activités
const SESSION_GAP_MS = 20 * 60000; // revenir après 20 min d'absence = nouvelle session
const SESSION_WARMUP_MS = 30000; // en début de session, on la laisse dire bonjour avant toute nouveauté
const CARD_STALE_MS = 6 * 3600000; // une carte de nouveauté jamais vue ne bloque pas la suite au-delà
// Une activité exauce aussi l'envie de soin correspondante
const ACTIVITY_WISH = { foot: "jouer", course: "jouer", danse: "danser" };
// Humeur d'une réaction de goût → réaction visuelle (lib/creatureLook.js REACTIONS)
const MOOD_REACT = { love: "adore", like: "aime", dislike: "deteste" };

// Le Sac (pièces, objets) : appelé à l'intérieur des actions seulement
const inv = () => useInventoryStore();
const safeToast = (text, icon) => { try { gameToast(text, icon); } catch { /* hors navigateur */ } };

let decayTimer = null;
let visibilityBound = false;
let neglectedDuringDecay = false;

export const useTamagotchiStore = defineStore(
  "tamagotchi",
  () => {
    const schema = ref(0);
    const name = ref("");
    const hunger = ref(75);
    const cleanliness = ref(75);
    const fun = ref(80);
    const energy = ref(100);
    const health = ref(100);
    const isSleeping = ref(false);
    const lastUpdate = ref(0);
    const traits = ref(Object.fromEntries(TRAITS.map((t) => [t, 0])));
    const neglectedAt = ref(0);
    const xp = ref(0);
    const bornAt = ref(0);
    const counters = ref({});
    const unlocked = ref([]);
    const palette = ref("printemps");
    const ui = ref("pastel");
    const lastVisitDay = ref("");
    const streak = ref(0);
    const pendingBonus = ref(0);
    // nouveautés du schéma 2
    const hatched = ref(false);
    const eggHeat = ref(0);
    const onboardStep = ref(0);
    const hatchedAt = ref(0);
    const stage = ref("oeuf");
    const cooldowns = ref({});
    const wish = ref(null);
    const wishesDone = ref(0);
    const illness = ref(null);
    const exhausted = ref(false);
    const quests = ref({ day: "", list: [] });
    const journal = ref([]);
    const bestStreak = ref(0);
    const totalDays = ref(0);
    const jokers = ref(0);
    const nextWishAt = ref(0);
    const lastWishId = ref("");
    const surpriseLog = ref({ day: "", n: 0 });
    // schéma 3
    const welcomeGift = ref(0); // pièces offertes aux parties existantes, versées au démarrage
    // schéma 4
    const features = ref({}); // nouveautés débloquées { [clé de FEATURES]: horodatage }
    const tasteSeed = ref(""); // graine de ses goûts, figée à l'éclosion (hatchedAt + nom)
    const playsToday = ref({ day: "", counts: {} }); // parties par activité aujourd'hui (rendement dégressif)
    const mealBoostUntil = ref(0);
    const playDaysRewarded = ref([]); // paliers de jours de jeu cumulés déjà récompensés
    const returnGift = ref(0); // cadeau de retour après une pause (pièces), à récupérer
    // schéma 5 : rythme des nouveautés
    const playMs = ref(0); // temps de jeu actif cumulé (appli ouverte et visible)
    const sessions = ref(0); // nombre de visites (retour après SESSION_GAP_MS)
    const revealAt = ref({ play: 0, session: 0 }); // moment de la dernière nouveauté
    const unlockEvent = ref(null); // dernière nouveauté { key, label, icon, at, seen } (carte UnlockCard)
    // schéma 6 : son apparence (lib/appearance.js), tirée à l'éclosion et gardée toute sa vie.
    // null tant qu'elle est dans l'œuf ; les créatures écloses avant ce schéma gardent l'original.
    const appearance = ref(null);
    // schéma 7 : la maison (plusieurs créatures, une seule dans le pré)
    // roster : [{ id, createdAt, data (PER_CREATURE_KEYS, figé tant qu'elle se repose), outfit,
    //            tastesSeen, portrait (petite image), restingSince (0 si elle est dans le pré) }]
    const roster = ref([]);
    const activeId = ref("");
    const slotsSeen = ref(1); // places déjà annoncées (carte « Une nouvelle place dans la maison ! »)
    // non persistant
    let sessionStartPlay = 0;
    let lastPlayTick = 0;
    let hiddenAt = 0;
    const away = ref(null);
    const awaySeconds = ref(0);
    const tick = ref(Date.now());
    const speed = ref(1);
    let lastTickleXp = 0;
    let needQuestUpgrade = false;

    const level = computed(() => levelInfo(xp.value).level);
    // le plus haut niveau de la maison : la progression (nouveautés, boutique, places) ne recule
    // pas quand un bébé vient dans le pré
    const topLevel = computed(() => Math.max(level.value, ...roster.value
      .filter((e) => e.id !== activeId.value).map((e) => levelInfo(e.data?.xp || 0).level)));
    // ses goûts (nouveaux à chaque œuf) : voir lib/tastes.js
    const tastes = computed(() => tastesFor(tasteSeed.value || `${hatchedAt.value || 0}${name.value || ""}`));
    const unlockedPages = computed(() => {
      const pages = ["maison", "elle"];
      // la page Jours (bonus, défis, journal) arrive avec les défis
      if (features.value.defis) pages.push("jours");
      if (topLevel.value >= PAGE_UNLOCK_LEVEL.album) pages.push("album");
      return pages;
    });

    const ageDays = (now = Date.now()) =>
      hatched.value && hatchedAt.value ? Math.max(0, ((now - hatchedAt.value) * speed.value) / DAY_MS) : 0;

    const stageInfo = computed(() => {
      const key = hatched.value ? stage.value : "oeuf";
      const def = stageDef(key);
      const next = nextStage(key);
      if (key === "oeuf") {
        return { key, label: "Œuf", next: "bebe", nextLabel: "Bébé", progress: Math.min(1, eggHeat.value / 12), hint: "en tapant doucement sur l'œuf" };
      }
      if (!next) return { key, label: def.label, next: null, nextLabel: "", progress: 1, hint: "Elle a fini de grandir, mais elle a encore plein de choses à découvrir." };
      const days = ageDays(tick.value);
      const pl = Math.min(1, level.value / next.level);
      const pd = next.days ? Math.min(1, days / next.days) : 1;
      const need = `au niveau ${next.level} et ${next.days} jour${next.days > 1 ? "s" : ""}`;
      return { key, label: def.label, next: next.key, nextLabel: next.label, progress: Math.min(pl, pd), hint: need };
    });

    const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const dayNumber = (key) => {
      const [y, m, d] = String(key).split("-").map(Number);
      return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
    };

    // ---------- journal ----------
    function addJournal(type, text, icon = "solar:book-bookmark-bold-duotone") {
      const t = Date.now();
      journal.value.unshift({ id: `${t}-${Math.floor(Math.random() * 1e4)}`, t, type, text, icon });
      if (journal.value.length > 100) journal.value.length = 100;
    }

    // ---------- expérience, niveaux, stades ----------
    function evalStage() {
      if (!hatched.value) return null;
      const target = stageFor(level.value, ageDays());
      if (STAGE_ORDER.indexOf(target) > STAGE_ORDER.indexOf(stage.value)) {
        stage.value = target;
        const def = stageDef(target);
        addJournal("stade", `Elle est devenue ${def.label.toLowerCase()} !`, "solar:stars-bold-duotone");
        safeToast(`${name.value || "Elle"} grandit : ${def.label} !`, "solar:stars-bold-duotone");
        return target;
      }
      return null;
    }

    function addXp(n) {
      if (!n) return { levelUp: false, stageUp: null };
      const before = level.value;
      xp.value += n;
      const levelUp = level.value > before;
      let coins = 0, gems = 0;
      if (levelUp) {
        addJournal("niveau", `Niveau ${level.value} atteint.`, "solar:star-bold-duotone");
        for (let l = before + 1; l <= level.value; l++) {
          coins += LEVEL_COINS;
        }
        try { inv().earn(coins); } catch { /* Sac indisponible */ }
      }
      return { levelUp, stageUp: evalStage(), coins, gems };
    }

    // ---------- visites, jours de jeu, défis ----------
    const questCtx = () => {
      let props = [];
      try { props = inv().props; } catch { /* Sac indisponible */ }
      return { props, features: features.value };
    };
    // 3 défis du jour (1 soin, 1 score, 1 envie) ; force : régénère (ex. au déblocage des défis)
    function ensureQuests(key, force = false) {
      if (quests.value.day === key && !force) return;
      const old = quests.value.day === key ? quests.value.list || [] : [];
      const list = questsForDay(key, level.value, questCtx()).map((f) => {
        const o = old.find((q) => q.id === f.id);
        return o ? { ...f, progress: Math.min(f.target, o.progress || 0), claimed: !!o.claimed } : f;
      });
      quests.value = { day: key, list, bonusClaimed: false };
    }
    // Ancien format (3-4 défis, achats, coffre...) : nouveau format en gardant l'avancement du jour
    function upgradeQuests() {
      const old = quests.value;
      if (!old?.day) return;
      const fresh = questsForDay(old.day, level.value, questCtx());
      const list = fresh.map((f) => {
        const o = (old.list || []).find((q) => q.action === f.action);
        return o ? { ...f, progress: Math.min(f.target, o.progress || 0), claimed: !!o.claimed } : f;
      });
      quests.value = { day: old.day, list, bonusClaimed: false };
    }
    // Tous les défis du jour récupérés (UI : « Tout est fait, à demain ! » une fois le bonus pris)
    const questsAllDone = computed(() => {
      const l = quests.value.list || [];
      return l.length > 0 && l.every((q) => q.claimed);
    });
    const questBonusReady = computed(() => questsAllDone.value && !quests.value.bonusClaimed);
    function claimQuestBonus() {
      if (!questBonusReady.value) return { ok: false, xp: 0, coins: 0, levelUp: false };
      quests.value = { ...quests.value, bonusClaimed: true };
      try { inv().earn(QUEST_BONUS.coins, "Tous les défis du jour"); } catch { /* Sac indisponible */ }
      const r = addXp(QUEST_BONUS.xp);
      return { ok: true, xp: QUEST_BONUS.xp, coins: QUEST_BONUS.coins, levelUp: r.levelUp };
    }

    // Pas de série à protéger : on compte les jours de jeu CUMULÉS (paliers 7 / 14 / 30).
    // `streak` reste un simple compteur de jours consécutifs (succès), sans punition.
    function checkDailyVisit() {
      const key = dayKey(new Date());
      ensureQuests(key);
      if (lastVisitDay.value === key) return;
      let gap = 0;
      if (!lastVisitDay.value) {
        streak.value = 1;
      } else {
        gap = dayNumber(key) - dayNumber(lastVisitDay.value);
        streak.value = gap === 1 ? streak.value + 1 : 1;
      }
      lastVisitDay.value = key;
      totalDays.value += 1;
      bestStreak.value = Math.max(bestStreak.value, streak.value);
      if (hatched.value) {
        // retour après une pause : un petit cadeau, jamais de reproche
        if (gap >= 3 && features.value.coins) returnGift.value = RETURN_GIFT_COINS + Math.min(30, gap * 2);
        rewardPlayDays();
      }
      if (hatched.value && onboardStep.value >= 6) pendingBonus.value = 10 + 5 * (Math.min(totalDays.value, 7) - 1);
    }
    function rewardPlayDays() {
      for (const r of PLAY_DAYS_REWARDS) {
        if (totalDays.value < r.days || playDaysRewarded.value.includes(r.days)) continue;
        playDaysRewarded.value = [...playDaysRewarded.value, r.days];
        try { inv().earn(r.coins, `${r.days} jours ensemble`); } catch { /* Sac indisponible */ }
        addJournal("jours", `${r.days} jours passés ensemble !`, "solar:calendar-mark-bold-duotone");
      }
      for (const m of MASTERY) if (m.kind === "days" && totalDays.value >= m.days) claimMastery(m.id);
    }
    function claimReturnGift() {
      const n = returnGift.value;
      returnGift.value = 0;
      if (n) { try { inv().earn(n, "Elle t'a gardé un cadeau"); } catch { /* Sac indisponible */ } }
      return n;
    }

    // Pièces du bonus du jour (selon les jours de jeu cumulés ; seulement une fois les pièces découvertes)
    const pendingBonusCoins = computed(() => (pendingBonus.value && features.value.coins ? 20 + 5 * (Math.min(Math.max(totalDays.value, 1), 7) - 1) : 0));

    // Renvoie l'expérience gagnée (nombre) ; les pièces sont versées dans le Sac
    function claimBonus() {
      const gained = pendingBonus.value;
      const coins = pendingBonusCoins.value;
      pendingBonus.value = 0;
      if (gained) addXp(gained);
      if (coins) { try { inv().earn(coins); } catch { /* Sac indisponible */ } }
      return gained;
    }

    function claimQuest(id) {
      const q = quests.value.list.find((x) => x.id === id);
      if (!q || q.claimed || q.progress < q.target) return { ok: false, xp: 0, coins: 0, levelUp: false };
      q.claimed = true;
      const xpGain = q.xp ?? 10;
      const coins = q.coins ?? 20;
      try { inv().earn(coins); } catch { /* Sac indisponible */ }
      const r = addXp(xpGain);
      count("defi");
      return { ok: true, xp: xpGain, coins, levelUp: r.levelUp };
    }

    // value : pour les défis à seuil (q.min), ex. count("score:foot", 1, 12)
    const count = (key, n = 1, value) => {
      counters.value[key] = (counters.value[key] || 0) + n;
      const q = (quests.value.list || []).find((x) => x.action === key && x.progress < x.target && (x.min == null || (value ?? 0) >= x.min));
      if (q) {
        q.progress = Math.min(q.target, q.progress + n);
        if (q.progress >= q.target && features.value.defis) safeToast(`Défi réussi : ${q.label}`, "solar:cup-star-bold-duotone");
      }
    };
    // Compteur d'événements (défis, succès) utilisable depuis les autres stores et composants
    function countEvent(key, n = 1, value) { count(key, n, value); }

    function rename(newName) {
      const clean = String(newName || "").trim().slice(0, 16);
      if (clean) name.value = clean;
    }

    function initName() {
      if (!name.value) name.value = generateRandomName();
    }

    // Nouvelle partie : un nouvel œuf, tout repart de zéro
    function resetGame() {
      hunger.value = 75; cleanliness.value = 75; fun.value = 80; energy.value = 100; health.value = 100;
      isSleeping.value = false;
      traits.value = Object.fromEntries(TRAITS.map((t) => [t, 0]));
      neglectedAt.value = 0; xp.value = 0; counters.value = {}; unlocked.value = [];
      bornAt.value = Date.now(); lastUpdate.value = Date.now();
      name.value = generateRandomName();
      hatched.value = false; eggHeat.value = 0; onboardStep.value = 0; hatchedAt.value = 0; stage.value = "oeuf";
      cooldowns.value = {}; wish.value = null; wishesDone.value = 0; illness.value = null; exhausted.value = false;
      quests.value = { day: "", list: [] }; journal.value = [];
      bestStreak.value = 0; totalDays.value = 0; jokers.value = 0; streak.value = 0;
      lastVisitDay.value = ""; pendingBonus.value = 0; nextWishAt.value = 0; lastWishId.value = "";
      surpriseLog.value = { day: "", n: 0 }; away.value = null; welcomeGift.value = 0;
      tasteSeed.value = ""; appearance.value = null; playsToday.value = { day: "", counts: {} }; mealBoostUntil.value = 0; returnGift.value = 0;
      // l'inventaire et les nouveautés débloquées sont CONSERVÉS : on redécouvre la garde-robe
      // avec une autre personnalité (nouveaux goûts à découvrir)
      try { inv().resetTastes(); } catch { /* Sac indisponible */ }
      roster.value = []; activeId.value = ""; slotsSeen.value = 1;
      ensureRoster();
      schema.value = SCHEMA;
      checkDailyVisit();
    }

    function nudge(trait, amount) {
      const v = traits.value[trait] || 0;
      traits.value[trait] = Math.min(1, v + amount * (1 - v));
    }
    function soothe(trait, amount) {
      traits.value[trait] = Math.max(0, (traits.value[trait] || 0) * (1 - amount));
    }
    const tr = (t) => traits.value[t] || 0;

    // Boude-t-il ? Une créature rancunière boude un moment après avoir été négligée.
    function isSulking(now = Date.now()) {
      const r = traits.value.rancuniere || 0;
      if (r < 0.3 || !neglectedAt.value) return false;
      const duration = (r * 4 * 3600 * 1000) / speed.value;
      return now - neglectedAt.value < duration;
    }

    // ---------- migration ----------
    function migrate() {
      // la créature déjà là devient la première de la maison (rien n'est perdu)
      ensureRoster();
      const patch = migrateSnapshot({
        schema: schema.value, hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value,
        energy: energy.value, health: health.value, lastUpdate: lastUpdate.value, bornAt: bornAt.value,
        streak: streak.value, totalDays: totalDays.value, bestStreak: bestStreak.value, hatched: hatched.value,
        features: features.value,
      });
      if (!patch) return;
      const refs = { schema, hunger, cleanliness, fun, energy, health, hatched, onboardStep, hatchedAt, stage, exhausted, totalDays, bestStreak };
      for (const [k, v] of Object.entries(patch)) if (refs[k]) refs[k].value = v;
      if (patch.hatched) stage.value = stageFor(level.value, ageDays());
      if (patch.welcomeCoins) welcomeGift.value += patch.welcomeCoins;
      // les défis passent au nouveau format au démarrage (le Sac doit être prêt)
      if (patch.upgradeQuests) needQuestUpgrade = true;
      if (patch.seedTastes && hatched.value && !tasteSeed.value) tasteSeed.value = `${hatchedAt.value || 0}${name.value || ""}`;
      // déjà éclose avant les apparences : elle garde son look d'origine (pas de nouveau tirage)
      if (patch.keepAppearance && hatched.value && !appearance.value) appearance.value = { ...ORIGINAL_APPEARANCE };
      // parties existantes : les nouveautés arrivent une à une (voir checkUnlocks), comme pour
      // une nouvelle partie. Les sauvegardes qui avaient tout reçu d'un coup repartent de zéro
      // (le Sac est conservé ; les cadeaux de découverte ne sont pas doublés).
      if (patch.relockFeatures) { features.value = {}; unlockEvent.value = null; revealAt.value = { play: playMs.value, session: 0 }; }
    }

    // ---------- éclosion, tutoriel ----------
    function hatch(newName) {
      if (hatched.value) return;
      const now = Date.now();
      if (newName) rename(newName);
      initName();
      hatched.value = true;
      eggHeat.value = 12;
      hatchedAt.value = now;
      bornAt.value = now;
      lastUpdate.value = now;
      stage.value = "bebe";
      tasteSeed.value = `${now}${name.value}`; // ses goûts sont fixés à la naissance
      appearance.value = { ...appearanceFor(tasteSeed.value) }; // et son apparence aussi
      if (onboardStep.value < 1) onboardStep.value = 1;
      // petit creux et petit ennui pour le tutoriel
      hunger.value = 55; fun.value = 50; cleanliness.value = 80; energy.value = 100; health.value = 100;
      addJournal("naissance", `${name.value} vient d'éclore. Bienvenue au monde !`, "solar:stars-bold-duotone");
    }
    function tapEgg() {
      if (hatched.value) return eggHeat.value;
      eggHeat.value = Math.min(12, eggHeat.value + 1);
      if (eggHeat.value >= 12) hatch();
      return eggHeat.value;
    }
    function setOnboardStep(n) {
      onboardStep.value = Math.max(0, Math.min(6, Number(n) || 0));
      if (onboardStep.value >= 6) finishOnboarding();
    }
    function finishOnboarding() {
      const now = Date.now();
      onboardStep.value = 6;
      lastUpdate.value = now;
      nextWishAt.value = now + (rand(25, 45) * 1000);
      checkDailyVisit();
      // bonus de bienvenue : seulement pour la toute première créature
      if (!veteran.value && !pendingBonus.value && streak.value <= 1) pendingBonus.value = 10;
    }

    // ---------- actions ----------
    const isEarly = (now) => hatched.value && hatchedAt.value > 0 && now - hatchedAt.value < EARLY_MS;
    const cooldownFor = (key, now) => Math.round((COOLDOWNS[key] || 0) * (isEarly(now) ? EARLY_COOLDOWN : 1));
    const evening = () => { const h = new Date().getHours(); return h >= 19 || h < 6; };

    function uselessReason(key) {
      const tuto = onboardStep.value < 6;
      switch (key) {
        case "nourrir": return !tuto && hunger.value > 90 ? "Elle n'a pas faim." : null;
        case "laver": return !tuto && cleanliness.value > 90 ? "Elle est déjà toute propre." : null;
        case "jouer":
        case "danser":
          if (energy.value < 10) return "Elle est trop fatiguée pour jouer.";
          return !tuto && fun.value > 92 ? "Elle s'est assez amusée pour l'instant." : null;
        case "soigner":
          return !illness.value && !exhausted.value && health.value >= 70 ? "Elle va très bien !" : null;
        case "coucher":
          return !isSleeping.value && energy.value >= 60 && !evening() ? "Elle n'est pas fatiguée." : null;
        default: return null;
      }
    }

    function canAct(key) {
      const now = tick.value;
      if (key === "photo") return { ok: true, reason: "", readyAt: 0, cooldownMs: 0, remaining: 0 };
      if (!(key in COOLDOWNS)) return { ok: false, reason: "Action inconnue.", readyAt: 0, cooldownMs: 0, remaining: 0 };
      const readyAt = cooldowns.value[key] || 0;
      const cooldownMs = cooldownFor(key, now);
      const remaining = Math.max(0, readyAt - now);
      const res = (ok, reason = "") => ({ ok, reason, readyAt, cooldownMs, remaining });
      if (isSleeping.value && !["coucher", "soigner"].includes(key)) return res(false, "Elle dort, chut...");
      if (exhausted.value && ["jouer", "danser", "chatouiller"].includes(key)) return res(false, "Elle est trop épuisée, laisse-la se reposer.");
      const lvl = ACTION_UNLOCK_LEVEL[key];
      if (lvl && level.value < lvl) return res(false, `Elle saura le faire au niveau ${lvl}.`);
      if (remaining > 0) return res(false, "Un petit instant...");
      const why = uselessReason(key);
      return why ? res(false, why) : res(true);
    }

    function scheduleWish(now = Date.now()) {
      let secs;
      if (hatchedAt.value && now - hatchedAt.value < EARLY_MS) secs = rand(25, 45);
      else if (hatchedAt.value && now - hatchedAt.value < DAY_MS) secs = rand(180, 480);
      else secs = rand(1200, 3600);
      nextWishAt.value = now + (secs * 1000) / (speed.value > 1 ? speed.value : 1);
    }

    function applyAction(key) {
      const now = Date.now();
      tick.value = now;
      const fail = (reason) => ({ ok: false, reason, gains: {}, xp: 0, wishDone: false, levelUp: false, stageUp: null });
      if (key === "photo") return { ok: true, gains: {}, xp: 0, wishDone: false, levelUp: false, stageUp: null };
      const c = canAct(key);
      if (!c.ok) return fail(c.reason);

      const before = { hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value, energy: energy.value, health: health.value };
      const wasSleeping = isSleeping.value;
      let xpGain = XP[key] || 0;

      count(key);

      // Ce que l'on fait façonne son caractère
      switch (key) {
        case "nourrir": nudge("gourmande", hunger.value > 70 ? 0.05 : 0.012); soothe("rancuniere", 0.01); break;
        case "laver": nudge("coquette", cleanliness.value > 70 ? 0.05 : 0.015); soothe("rancuniere", 0.01); break;
        case "jouer": nudge("joueuse", 0.035); soothe("rancuniere", 0.03); break;
        case "chatouiller": nudge("caline", 0.015); soothe("rancuniere", 0.01); break;
        case "calin": nudge("caline", 0.025); soothe("rancuniere", 0.02); break;
        case "danser": nudge("joueuse", 0.015); soothe("rancuniere", 0.01); break;
        case "soigner": soothe("rancuniere", 0.01); break;
      }

      const up = (ref_, n, max = 100) => { ref_.value = Math.min(max, Math.max(0, ref_.value + n)); };
      switch (key) {
        case "nourrir":
          up(hunger, Math.round(18 * (1 + 0.3 * tr("gourmande"))));
          up(cleanliness, -2); up(energy, -1);
          break;
        case "laver": up(cleanliness, 18); break;
        case "jouer":
          up(fun, 14);
          up(energy, -Math.round(5 * (1 - 0.4 * tr("joueuse"))));
          break;
        case "danser": up(fun, 10); up(energy, -4); break;
        case "calin":
          if (fun.value > 96) xpGain = 0;
          up(fun, Math.round(4 * (1 + 0.3 * tr("caline"))));
          break;
        case "chatouiller":
          up(fun, 2);
          if (now - lastTickleXp < 10000) xpGain = 0; else lastTickleXp = now;
          break;
        case "coucher":
          if (isSleeping.value) { isSleeping.value = false; xpGain = 0; }
          else isSleeping.value = true;
          break;
        case "soigner":
          if (illness.value) { illness.value = null; count("guerison"); addJournal("sante", "Elle est guérie de son rhume.", "solar:pill-bold-duotone"); }
          up(health, exhausted.value ? 30 : 15);
          break;
      }
      if (exhausted.value && health.value >= 25) {
        exhausted.value = false;
        count("revive");
        addJournal("sante", "Elle a repris des forces, la voilà sur pied.", "solar:heart-bold-duotone");
        safeToast("Elle a repris des forces !", "solar:heart-bold-duotone");
      }

      const cd = cooldownFor(key, now);
      if (cd > 0) cooldowns.value = { ...cooldowns.value, [key]: now + cd };

      // envie exaucée
      let wishDone = false;
      if (!(key === "coucher" && wasSleeping) && fulfillWish(key, now)) {
        wishDone = true;
        xpGain += 5;
      }

      // tutoriel : l'étape avance dès que l'action attendue est faite
      if (onboardStep.value === 2 && key === "nourrir") onboardStep.value = 3;
      else if (onboardStep.value === 3 && key === "jouer") onboardStep.value = 4;
      else if (onboardStep.value === 4 && key === "chatouiller") onboardStep.value = 5;

      // quelques pièces pour les soins utiles (rien pour tendresse, fou rire, soigner),
      // seulement une fois les pièces découvertes
      let coins = 0;
      if (features.value.coins) {
        if (xpGain > 0 && CARE_COINS[key]) coins = randInt(...CARE_COINS[key]);
        if (wishDone) coins += WISH_COINS;
      }
      if (coins) { try { inv().earn(coins); } catch { coins = 0; } }

      const r = addXp(xpGain);
      const after = { hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value, energy: energy.value, health: health.value };
      const gains = {};
      for (const k of Object.keys(after)) if (after[k] > before[k]) gains[k] = Math.round(after[k] - before[k]);
      return { ok: true, gains, xp: xpGain, coins, wishDone, levelUp: r.levelUp, stageUp: r.stageUp };
    }

    // Exauce l'envie en cours si elle correspond. Renvoie true si exaucée.
    //   action : action de soin ("nourrir"...), ou "repas" | "activite" | "tenue" (envies d'objets possédés)
    //   target : recette / activité / item ; color : couleur (tenue)
    function fulfillWish(actionKey, now = Date.now(), target, color) {
      const w = wish.value;
      if (!w || w.action !== actionKey) return false;
      if (w.target && w.target !== target) return false;
      if (w.color && w.color !== color) return false;
      wishesDone.value += 1;
      count("envie");
      lastWishId.value = wish.value.id;
      if (wishesDone.value === 1 || wishesDone.value % 5 === 0) {
        addJournal("envie", `Envie exaucée (${wishesDone.value} au total). Elle est ravie !`, "solar:chat-round-dots-bold-duotone");
      }
      wish.value = null;
      scheduleWish(now);
      return true;
    }

    const gauges = { hunger, cleanliness, fun, energy };
    const snap = () => ({ hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value, energy: energy.value, health: health.value });
    const diffGains = (before) => {
      const after = snap(), gains = {};
      for (const k of Object.keys(after)) if (Math.round(after[k] - before[k]) !== 0) gains[k] = Math.round(after[k] - before[k]);
      return gains;
    };
    const bump = (ref_, n) => { ref_.value = Math.min(100, Math.max(0, ref_.value + n)); };

    // ---------- goûts : réactions ----------
    // Montre sa réaction (visage + bulle) ; reveal : goûts révélés au carnet
    function showReaction(r, { say = true } = {}) {
      if (!r) return;
      try { for (const k of r.reveal || []) inv().revealTaste(k, tastes.value); } catch { /* Sac indisponible */ }
      if (!say) return;
      try {
        if (MOOD_REACT[r.mood]) gameCommand("react", MOOD_REACT[r.mood]);
        // après la réplique générique de la réaction visuelle
        if (r.line) setTimeout(() => gameSay(r.line), 80);
      } catch { /* hors navigateur */ }
    }
    // Réaction de goût sans effet de jeu (aperçu, essayage) : { mood, mult, line, reveal }
    function tasteReactionFor(kind, id, color) {
      return tasteReaction(kind, id, color, { tastes: tastes.value, stage: stage.value, traits: traits.value });
    }

    // Appelé par inventory.equip : coquette, réaction, envie de tenue, défi « tenue qu'elle adore »
    function onEquip(id, color) {
      const now = Date.now();
      nudge("coquette", 0.02);
      const r = tasteReactionFor("item", id, color);
      if (r.mood === "love") count("tenue-aimee");
      let wishDone = false;
      if (fulfillWish("tenue", now, id, color)) {
        wishDone = true;
        addXp(5);
        if (features.value.coins) { try { inv().earn(OWNED_WISH_COINS); } catch { /* Sac indisponible */ } }
      }
      showReaction(r);
      return { ...r, wishDone };
    }

    // ---------- maîtrise (Étoiles) ----------
    // Tant que les Étoiles ne sont pas découvertes (dernière étape de la chaîne), la maîtrise
    // attend : elle est versée au moment de la découverte (catchUpMastery).
    function claimMastery(id) {
      const m = masteryById(id);
      if (!m || !features.value.etoiles) return { ok: false, gems: 0 };
      try {
        if (inv().hasMastery(id)) return { ok: false, gems: 0 };
        inv().markMastery(id);
        inv().earnGems(m.gems, m.label);
      } catch { return { ok: false, gems: 0 }; }
      addJournal("maitrise", `Maîtrise : ${m.label} !`, "solar:star-bold-duotone");
      return { ok: true, gems: m.gems };
    }

    function catchUpMastery() {
      try {
        const i = inv();
        for (const m of MASTERY) {
          const done = m.kind === "days" ? totalDays.value >= m.days
            : m.kind === "score" ? (i.stats?.best?.[m.activity] || 0) >= m.score
              : m.kind === "stars" ? Object.values(i.recipeStars || {}).some((n) => n >= m.stars) : false;
          if (done) claimMastery(m.id);
        }
      } catch { /* Sac indisponible */ }
    }

    // ---------- nouveautés débloquées une à une ----------
    const hasFeature = (key) => !!features.value[key];
    // Débloque une nouveauté et offre son cadeau de découverte. Renvoie true si nouvelle.
    // silent : pas de toast / journal / réaction (rattrapage des anciennes parties)
    function unlockFeature(key, { silent = false } = {}) {
      if (!FEATURES[key] || features.value[key]) return false;
      const now = Date.now();
      features.value = { ...features.value, [key]: now };
      revealAt.value = { play: playMs.value, session: sessions.value };
      const who = name.value || "Elle";
      let say = "";
      try {
        switch (key) {
          case "ballon":
            inv().grantStarterKit("ballon");
            if (!silent) { addJournal("objet", `${who} a trouvé un ballon !`, "ph:soccer-ball-fill"); say = "Oh ! Un ballon ! On joue ?"; }
            break;
          case "sac": {
            const color = tastes.value.color;
            inv().grantStarterKit("tshirt", { color });
            if (!silent) {
              addJournal("objet", "Un t-shirt rien que pour elle, dans sa couleur préférée.", "solar:t-shirt-bold-duotone");
              showReaction(tasteReactionFor("color", color));
            }
            break;
          }
          case "boutique":
            payWelcomeGift();
            break;
          case "cuisine":
            inv().grantStarterKit("crepes");
            if (!silent) say = "On fait des crêpes ? J'ai tout ce qu'il faut !";
            break;
          case "tele":
            inv().grantStarterKit("tele");
            if (!silent) addJournal("objet", "Une télé et un canapé dans le pré !", "solar:tv-bold-duotone");
            break;
          case "defis":
            ensureQuests(dayKey(new Date()), true);
            break;
          case "course":
            inv().grantStarterKit("baskets");
            if (!silent) say = "Des baskets ! On fait la course ?";
            break;
          case "etoiles":
            inv().grantStarterKit("etoiles", { gems: 3 });
            catchUpMastery(); // maîtrises déjà atteintes : versées maintenant
            break;
        }
      } catch { /* Sac indisponible */ }
      if (!silent) {
        const f = FEATURES[key];
        unlockEvent.value = { key, label: f.label, icon: f.icon, at: now, seen: false };
        // pas de toast : components/UnlockCard.vue raconte la découverte
        if (say) { try { gameSay(say); } catch { /* hors navigateur */ } }
      }
      return true;
    }
    // Conditions de déblocage (voir lib/growth.js FEATURES). Ordre imposé par la chaîne.
    function featureDue(key, now) {
      const f = features.value;
      const lvl = topLevel.value;
      const mins = hatchedAt.value ? ((now - hatchedAt.value) * speed.value) / 60000 : 0;
      const reach = lvl >= FEATURES[key].level;
      switch (key) {
        case "ballon": return mins >= 3 || reach;
        // d'abord par la 1re partie de foot ; sinon, deux visites plus tard
        case "coins": return f.ballon && ((counters.value["activite:foot"] || 0) > 0 || (reach && sessions.value - revealAt.value.session >= 2));
        case "sac": return f.coins && (mins >= 6 || reach);
        case "boutique": case "cuisine": return f.sac && reach;
        case "tele": case "defis": return f.cuisine && (mins >= 8 * 60 || totalDays.value >= 2 || reach);
        case "collection": return f.tele && f.defis && (totalDays.value >= 2 || reach);
        case "course": case "etoiles": return f.collection && (totalDays.value >= 3 || reach);
        default: return false;
      }
    }
    // Assez respiré depuis la nouveauté précédente ? (voir FEATURES.gap / session)
    function paceOk(key) {
      const p = FEATURES[key];
      const since = playMs.value - (revealAt.value.play || 0);
      const newSession = sessions.value > (revealAt.value.session || 0);
      const warm = playMs.value - sessionStartPlay >= SESSION_WARMUP_MS;
      if (newSession && warm) return true;
      if (!newSession && p.session) return since >= p.gap * 3 * 60000; // très longue visite
      return since >= p.gap * 60000 && (p.gap > 0 || warm);
    }
    // La carte de la nouveauté précédente n'a pas encore été vue : on attend
    function cardPending(now) {
      const ev = unlockEvent.value;
      return !!ev && !ev.seen && now - ev.at < CARD_STALE_MS;
    }
    function ackUnlock() {
      if (unlockEvent.value && !unlockEvent.value.seen) unlockEvent.value = { ...unlockEvent.value, seen: true };
    }
    // Une nouveauté à la fois, espacées par le temps de jeu et les visites
    function checkUnlocks(now = Date.now()) {
      if (!hatched.value || onboardStep.value < 6) return null;
      if (cardPending(now)) return null;
      const key = FEATURE_KEYS.find((k) => !features.value[k] && featureDue(k, now));
      if (!key || !paceOk(key)) return null;
      unlockFeature(key);
      return key;
    }
    // Temps de jeu actif (onglet visible, après le tutoriel) et visites
    function tickPlay(now) {
      const visible = typeof document === "undefined" || document.visibilityState === "visible";
      if (lastPlayTick && visible && hatched.value && onboardStep.value >= 6) playMs.value += Math.min(5000, Math.max(0, now - lastPlayTick));
      lastPlayTick = now;
    }
    function newSession() {
      sessions.value += 1;
      sessionStartPlay = playMs.value;
    }

    // ---------- activités (mini-jeux 3D) ----------
    // Peut-elle faire cette activité maintenant ? (à vérifier avant de lancer le mini-jeu)
    function canActivity(id) {
      const a = activityById(id);
      if (!a) return { ok: false, reason: "Activité inconnue." };
      if (a.soon) return { ok: false, reason: "Bientôt !", soon: true };
      if (!hatched.value) return { ok: false, reason: "Elle n'est pas encore née !" };
      if (a.feature && !features.value[a.feature]) return { ok: false, reason: "Pas encore découvert.", locked: true };
      if (level.value < a.minLevel) return { ok: false, reason: `Débloqué au niveau ${a.minLevel}.` };
      try { if (a.prop && !inv().hasProp(a.prop)) return { ok: false, reason: "Il te manque un objet.", needProp: a.prop }; } catch { /* Sac indisponible */ }
      if (isSleeping.value) return { ok: false, reason: "Elle dort, chut..." };
      if (exhausted.value) return { ok: false, reason: "Elle est trop épuisée, laisse-la se reposer." };
      // rancunière : refuse de jouer juste après avoir été négligée (la télé, elle, se partage)
      if (id !== "tele" && tr("rancuniere") > 0.5 && isSulking(tick.value)) return { ok: false, reason: "Elle boude encore un peu... un peu de tendresse d'abord ?", sulking: true };
      if (a.energyCost > 0 && energy.value < a.energyCost + 3) return { ok: false, reason: "Elle est trop fatiguée. Un petit dodo ?" };
      return { ok: true, reason: "" };
    }

    // Sensations de jeu pour les mini-jeux : { hitWindow (×, 0.6-1.5), clumsy (0-0.35) }
    // joueuse élargit la fenêtre de frappe, fatigue et mauvaise humeur la réduisent, un bébé est maladroit
    function playFeel() {
      const tired = energy.value < 30 ? (30 - energy.value) / 30 : 0;
      const grumpy = fun.value < 30 ? (30 - fun.value) / 30 : 0;
      const w = 1 + 0.35 * tr("joueuse") - 0.3 * tired - 0.2 * grumpy - (isSulking(tick.value) ? 0.1 : 0);
      const clumsy = { bebe: 0.35, enfant: 0.15, ado: 0.05, adulte: 0 }[stage.value] ?? 0;
      return { hitWindow: Math.max(0.6, Math.min(1.5, w)), clumsy };
    }

    function playsOf(id) {
      const today = dayKey(new Date());
      return playsToday.value.day === today ? playsToday.value.counts[id] || 0 : 0;
    }

    // À la fin d'un mini-jeu : applique les effets, l'expérience, les pièces et le record.
    // result : { score, channel? (télé : chaîne regardée le plus longtemps) }
    // Renvoie { ok, reason?, gains, xp, coins, best, isRecord, wishDone, levelUp, stageUp,
    //           reaction (goût pour l'activité), channelReaction?, falloff, playsToday }
    // Une partie jouée n'est jamais perdue (appeler aussi quand la partie est interrompue).
    function applyActivity(id, { score = 0, channel = null } = {}) {
      const now = Date.now();
      tick.value = now;
      const a = activityById(id);
      const reason = !a ? "Activité inconnue." : !hatched.value ? "Elle n'est pas encore née !" : "";
      if (reason) return { ok: false, reason, gains: {}, xp: 0, coins: 0, best: 0, isRecord: false, wishDone: false, levelUp: false, stageUp: null, reaction: null, falloff: 1, playsToday: 0 };
      // la première partie fait découvrir les pièces
      if (!features.value.coins) unlockFeature("coins");
      const plays = playsOf(id);
      const reward = activityReward(id, score, plays);
      const r = tasteReactionFor("activity", id);
      const chR = id === "tele" && channel ? tasteReactionFor("channel", channel) : null;
      const mult = Math.max(r.mult, chR?.mult || 1);
      const boost = now < mealBoostUntil.value ? 1.2 : 1;
      const before = snap();
      bump(fun, Math.round(a.funGain * (0.7 + 0.5 * reward.ratio) * (1 + 0.2 * tr("joueuse")) * mult * boost));
      bump(energy, (a.energyGain || 0) - (a.energyCost || 0));
      if (a.energyCost) bump(hunger, -Math.round(a.energyCost * 0.4));
      if (id === "foot" || id === "course") bump(cleanliness, -6);
      if (id === "tele") bump(health, 1);
      if (id === "tele") nudge("caline", r.mood === "love" ? 0.05 : 0.03);
      else nudge("joueuse", r.mood === "love" ? 0.05 : 0.03);
      soothe("rancuniere", 0.02);
      count("activite:" + id);
      count("activite");
      if (!a.noScore) count("score:" + id, 1, Number(score) || 0);
      playsToday.value = playsToday.value.day === dayKey(new Date())
        ? { ...playsToday.value, counts: { ...playsToday.value.counts, [id]: plays + 1 } }
        : { day: dayKey(new Date()), counts: { [id]: 1 } };

      let xpGain = reward.xp;
      let coins = Math.round(reward.coins * mult);
      let wishDone = false;
      if (fulfillWish("activite", now, id) || (ACTIVITY_WISH[id] && fulfillWish(ACTIVITY_WISH[id], now))) {
        wishDone = true; xpGain += 5; coins += OWNED_WISH_COINS;
      }
      let rec = { best: 0, isRecord: false };
      try {
        if (!a.noScore) {
          rec = inv().recordScore(id, score);
          if (rec.isRecord) {
            coins += RECORD_COINS; // un record paie toujours, sans rendement dégressif
            safeToast(`Nouveau record : ${rec.best}${a.scoreUnit ? ` ${a.scoreUnit}` : ""} !`, "solar:cup-star-bold-duotone");
          }
        }
        inv().earn(coins);
      } catch { coins = 0; }
      for (const m of MASTERY) if (m.kind === "score" && m.activity === id && rec.best >= m.score) claimMastery(m.id);
      showReaction(r, { say: false });
      if (chR) showReaction(chR, { say: false });
      const lv = addXp(xpGain);
      return {
        ok: true, gains: diffGains(before), xp: xpGain, coins, best: rec.best, isRecord: rec.isRecord, wishDone,
        levelUp: lv.levelUp, stageUp: lv.stageUp, reaction: r, channelReaction: chR, falloff: reward.falloff, playsToday: plays + 1,
      };
    }

    // ---------- repas cuisinés ----------
    function canEatMeal(recipeId) {
      if (!recipeById(recipeId)) return { ok: false, reason: "Recette inconnue." };
      if (isSleeping.value) return { ok: false, reason: "Elle dort, chut..." };
      if (onboardStep.value >= 6 && hunger.value > 90) return { ok: false, reason: "Elle n'a pas faim." };
      return { ok: true, reason: "" };
    }

    // Lui fait manger un plat (le plat a déjà été pris dans le frigo ou vient d'être cuisiné).
    // stars (1-3) : 1x / 1,25x / 1,5x ; ses goûts : plat préféré ×1,5, détesté ×0,5.
    // Un repas rend de l'énergie et donne un petit bonus (+20 % d'amusement aux activités, 30 min).
    // Renvoie { ok, reason?, gains, xp, coins, wishDone, levelUp, stageUp, reaction }
    function eatMeal(recipeId, stars = 1) {
      const now = Date.now();
      tick.value = now;
      const c = canEatMeal(recipeId);
      if (!c.ok) return { ok: false, reason: c.reason, gains: {}, xp: 0, coins: 0, wishDone: false, levelUp: false, stageUp: null, reaction: null };
      const rcp = recipeById(recipeId);
      const r = tasteReactionFor("food", recipeId);
      const mult = starMult(stars) * r.mult;
      const before = snap();
      const fx = rcp.effects || {};
      const refs = { hunger, fun, health, energy, cleanliness };
      for (const [k, v] of Object.entries(fx)) {
        if (!refs[k]) continue;
        const boost = k === "hunger" ? 1 + 0.3 * tr("gourmande") : 1;
        bump(refs[k], v > 0 ? Math.round(v * mult * boost) : v);
      }
      nudge("gourmande", r.mood === "love" ? 0.06 : 0.03); soothe("rancuniere", 0.02);
      mealBoostUntil.value = now + MEAL_BOOST_MS;
      if (exhausted.value && health.value >= 25) { exhausted.value = false; count("revive"); }
      count("repas");
      count("nourrir");
      let xpGain = Math.round((rcp.xp || 0) * starMult(stars));
      let coins = 0;
      let wishDone = false;
      if (fulfillWish("repas", now, recipeId)) { wishDone = true; xpGain += 5; coins += OWNED_WISH_COINS; }
      else if (fulfillWish("nourrir", now)) { wishDone = true; xpGain += 5; coins += WISH_COINS; }
      if (coins) { try { inv().earn(coins); } catch { coins = 0; } }
      showReaction(r);
      const lv = addXp(xpGain);
      return { ok: true, gains: diffGains(before), xp: xpGain, coins, wishDone, levelUp: lv.levelUp, stageUp: lv.stageUp, reaction: r };
    }
    const mealBoostActive = computed(() => tick.value < mealBoostUntil.value);

    // Quand tout est plein (soins inutiles) : une activité ou un plat à proposer au lieu de griser
    // Renvoie { kind: "activite", id } | { kind: "repas", id } | null
    const idleSuggestion = computed(() => {
      void tick.value;
      if (!hatched.value || isSleeping.value || exhausted.value || onboardStep.value < 6) return null;
      const full = hunger.value > 90 && cleanliness.value > 90 && fun.value > 92;
      if (!full) return null;
      const acts = V1_ACTIVITIES.filter((a) => canActivity(a.id).ok);
      if (acts.length) {
        const fav = acts.find((a) => a.id === tastes.value.activity);
        return { kind: "activite", id: (fav || acts[0]).id };
      }
      let meals = {};
      try { meals = inv().meals || {}; } catch { /* Sac indisponible */ }
      const ready = V1_RECIPES.filter((x) => (meals[x.id] || 0) > 0);
      if (ready.length) return { kind: "repas", id: (ready.find((x) => x.id === tastes.value.food) || ready[0]).id };
      return null;
    });

    function countPhoto() { count("photo"); }
    function countGesture(g) { count(g); }
    function startSleeping() { isSleeping.value = true; }
    function wakeUp() { isSleeping.value = false; }

    // ---------- vie ----------
    // Fait vivre la créature pendant `seconds` secondes, à l'instant simulé `simT`.
    // resting : elle se repose dans la maison (voir REST_FACTOR / REST_FLOOR)
    function decay(seconds, simT, offline, resting = false) {
      if (exhausted.value) return;
      const hours = (seconds / 3600) * (resting ? REST_FACTOR : 1);
      const floors = resting ? Object.fromEntries(["hunger", "cleanliness", "fun", "energy"].map((k) => [k, Math.min(REST_FLOOR, gauges[k].value)])) : null;
      const night = dayPhase(new Date(simT)) === "night";
      const awakeNight = night && !isSleeping.value ? 1.3 : 1;
      const wear = hours * (isSleeping.value ? SLEEP_FACTOR : 1);

      hunger.value = Math.max(hunger.value - RATES.hunger * wear * (1 + 0.4 * tr("gourmande")), 0);
      cleanliness.value = Math.max(cleanliness.value - RATES.cleanliness * wear * (1 + 0.5 * tr("coquette")), 0);
      fun.value = Math.max(fun.value - RATES.fun * wear * awakeNight, 0);

      if (isSleeping.value) {
        energy.value = Math.min(energy.value + RATES.energySleeping * hours * (night ? 1.5 : 1), 100);
        if (energy.value >= 100) isSleeping.value = false;
      } else {
        energy.value = Math.max(energy.value - RATES.energyAwake * wear * awakeNight, 0);
        if (energy.value === 0) isSleeping.value = true;
      }
      if (floors) for (const [k, f] of Object.entries(floors)) gauges[k].value = Math.max(gauges[k].value, f);

      // santé
      const prev = health.value;
      let drain = 0;
      if (hunger.value === 0) drain += RATES.healthStarving * hours;
      if (illness.value) drain += RATES.illness * hours;
      if (resting) drain = 0; // au chaud, la santé ne baisse jamais
      if (drain > 0) {
        const floor = offline ? Math.min(prev, OFFLINE_HEALTH_FLOOR) : 0;
        health.value = Math.max(prev - drain, floor);
        if (hunger.value === 0) nudge("rancuniere", 0.03 * hours);
      } else if (!illness.value && hunger.value > 30 && cleanliness.value > 30 && fun.value > 20) {
        health.value = Math.min(100, prev + RATES.regen * hours);
      }
      if (health.value <= 0 && !offline) {
        health.value = 0;
        exhausted.value = true;
        isSleeping.value = false;
        addJournal("sante", "Elle est épuisée. Un peu de soin la remettra sur pied.", "solar:hourglass-bold-duotone");
        return;
      }

      // maladie : jamais dans les 24 h après l'éclosion
      if (!illness.value) {
        const safe = resting || !hatchedAt.value || simT - hatchedAt.value < DAY_MS;
        if (!safe && onboardStep.value >= 6 && (cleanliness.value < 25 || hunger.value < 10)) {
          if (Math.random() < 1 - Math.pow(0.85, hours)) {
            illness.value = { kind: "rhume", since: simT };
            addJournal("sante", "Elle a attrapé un petit rhume.", "solar:thermometer-bold-duotone");
          }
        }
      } else if (simT - illness.value.since > DAY_MS) {
        illness.value = null; // guérison naturelle après une journée
        addJournal("sante", "Son rhume est passé tout seul.", "solar:pill-bold-duotone");
      }

      if (!resting) {
        if (hunger.value === 0 || fun.value === 0 || cleanliness.value === 0) nudge("rancuniere", 0.03 * hours);
        if (hunger.value < 15 || fun.value < 15 || cleanliness.value < 15) neglectedDuringDecay = true;
      }

      const fade = 1 - (TRAIT_FADE_PER_DAY * hours) / 24;
      for (const t of TRAITS) traits.value[t] = (traits.value[t] || 0) * fade;
    }

    function buildAway(before, secs, illBefore) {
      // phrases variées : lib/dialogue.js awayLines
      const hungry = before.hunger - hunger.value > 25;
      const lines = awayLines({
        ill: !illBefore && !!illness.value,
        slept: energy.value - before.energy > 20,
        veryHungry: hungry && hunger.value < 20,
        hungry: hungry && hunger.value >= 20,
        dirty: before.cleanliness - cleanliness.value > 25,
        bored: before.fun - fun.value > 25,
      });
      let surprise = null;
      const today = dayKey(new Date());
      if (surpriseLog.value.day !== today) surpriseLog.value = { day: today, n: 0 };
      if (secs > 2 * 3600 && surpriseLog.value.n < 3 && Math.random() < 0.2) {
        surprise = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
        surpriseLog.value.n += 1;
        addXp(5);
      }
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const dur = h >= 1 ? `${h} h${m ? ` ${m}` : ""}` : `${m} min`;
      addJournal("retour", `Retrouvailles après ${dur}. ${lines[0]}`, "solar:hourglass-bold-duotone");
      away.value = { seconds: Math.round(secs), lines: lines.slice(0, 3), surprise };
    }

    function tickWishes(now) {
      if (!hatched.value || onboardStep.value < 6) return;
      if (wish.value && now >= wish.value.expiresAt) {
        lastWishId.value = wish.value.id;
        wish.value = null; // expire sans pénalité
        scheduleWish(now);
        return;
      }
      if (wish.value || isSleeping.value || exhausted.value) return;
      if (!nextWishAt.value) { scheduleWish(now); return; }
      if (now >= nextWishAt.value) {
        let bag = {};
        try { const i = inv(); bag = { owned: i.owned, outfit: i.outfit, meals: i.meals, pantry: i.pantry, recipesKnown: i.recipesKnown, props: i.props }; } catch { /* Sac indisponible */ }
        wish.value = pickWish({
          hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value, energy: energy.value, level: level.value,
          hatchedAt: hatchedAt.value, wish: null, lastWishId: lastWishId.value,
          stage: stage.value, features: features.value, tastes: tastes.value, ...bag,
        }, now);
      }
    }

    // Rattrape le temps passé depuis la dernière visite, puis continue en direct.
    function catchUp() {
      const now = Date.now();
      tick.value = now;
      tickPlay(now);
      if (!lastUpdate.value || lastUpdate.value > now) {
        lastUpdate.value = now;
        return 0;
      }
      checkDailyVisit();
      if (!hatched.value || onboardStep.value < 6) {
        lastUpdate.value = now; // aucune usure pendant l'œuf et le tutoriel
        return 0;
      }
      const realSec = (now - lastUpdate.value) / 1000;
      const offline = realSec > AWAY_MIN;
      let elapsed = Math.min(realSec * speed.value, MAX_CATCH_UP);
      const total = elapsed;
      const before = { hunger: hunger.value, cleanliness: cleanliness.value, fun: fun.value, energy: energy.value };
      const illBefore = !!illness.value;
      let simT = lastUpdate.value;
      while (elapsed > 0) {
        const step = Math.min(CATCH_UP_STEP, elapsed);
        simT += step * 1000;
        decay(step, simT, offline);
        elapsed -= step;
      }
      lastUpdate.value = now;
      if (neglectedDuringDecay) {
        neglectedAt.value = now;
        neglectedDuringDecay = false;
      }
      if (offline) {
        buildAway(before, total, illBefore);
        if (wish.value && wish.value.expiresAt < now) wish.value = null;
      }
      tickWishes(now);
      evalStage();
      checkUnlocks(now);
      checkSlots(now);
      return total;
    }

    // ---------- la maison : plusieurs créatures, une seule dans le pré ----------
    const perRefs = {
      name, hunger, cleanliness, fun, energy, health, isSleeping, lastUpdate, traits, neglectedAt, xp, bornAt,
      counters, hatched, eggHeat, onboardStep, hatchedAt, stage, cooldowns, wish, wishesDone, illness, exhausted,
      journal, nextWishAt, lastWishId, surpriseLog, tasteSeed, mealBoostUntil, appearance,
    };
    const snapshotActive = () => Object.fromEntries(PER_CREATURE_KEYS.map((k) => [k, clone(perRefs[k].value)]));
    const patchEntry = (id, fields) => { roster.value = roster.value.map((e) => (e.id === id ? { ...e, ...fields } : e)); };

    // Toujours au moins une créature dans la maison : la sauvegarde existante devient la n° 1
    function ensureRoster() {
      if (roster.value.some((e) => e.id === activeId.value)) return;
      const id = activeId.value || newCreatureId();
      roster.value = [...roster.value, {
        id, createdAt: hatchedAt.value || bornAt.value || Date.now(), data: {}, outfit: null, tastesSeen: [], portrait: "", restingSince: 0,
      }];
      activeId.value = id;
    }

    // places ouvertes (voir SLOT_RULES) : on joue, on grandit, la maison s'agrandit
    const slotsOpen = computed(() => {
      let n = 1;
      // la maison vient après les premières découvertes (Sac, Boutique, Cuisine)
      if (!features.value.cuisine) return n;
      for (let i = 1; i < MAX_SLOTS; i++) {
        const r = SLOT_RULES[i];
        if (topLevel.value >= r.level || totalDays.value >= r.days) n = i + 1;
        else break;
      }
      return n;
    });
    // une autre créature déjà éclose dans la maison : pas de tutoriel complet pour la suivante
    const veteran = computed(() => roster.value.some((e) => e.id !== activeId.value && e.data?.hatched));
    // vue simple pour l'interface (la créature du pré avec ses valeurs en direct)
    const house = computed(() => roster.value.map((e) => {
      const active = e.id === activeId.value;
      const d = active ? { name: name.value, appearance: appearance.value, stage: stage.value, xp: xp.value, hatched: hatched.value } : e.data || {};
      return {
        id: e.id, active, name: d.name || "...", appearance: d.appearance || null, hatched: !!d.hatched,
        stage: d.hatched ? d.stage || "bebe" : "oeuf", level: levelInfo(d.xp || 0).level, portrait: e.portrait || "",
        sleeping: !active && !!d.isSleeping,
      };
    }));
    const canAdopt = computed(() => hatched.value && onboardStep.value >= 6 && roster.value.length < slotsOpen.value);

    function setPortrait(id, url) {
      const e = roster.value.find((x) => x.id === id);
      if (e && url && e.portrait !== url) patchEntry(id, { portrait: url });
    }

    // Range la créature du pré dans son nid (elle se repose à partir de maintenant)
    function stashActive(now) {
      const data = snapshotActive();
      data.wish = null; // une envie ne survit pas à la sieste
      let outfit = null, seen = [];
      try { outfit = clone(inv().outfit); seen = [...(inv().stats?.tastesSeen || [])]; } catch { /* Sac indisponible */ }
      patchEntry(activeId.value, { data, outfit, tastesSeen: seen, restingSince: now });
    }

    // Rattrape le temps de repos au ralenti. Renvoie { seconds, before } ou null.
    function restCatchUp(from, now) {
      const realSec = from > 0 && from < now ? (now - from) / 1000 : 0;
      if (!realSec) return null;
      const before = snap();
      let elapsed = Math.min(realSec * speed.value, MAX_CATCH_UP);
      let simT = from;
      while (elapsed > 0) {
        const step = Math.min(CATCH_UP_STEP, elapsed);
        simT += step * 1000;
        decay(step, simT, true, true);
        elapsed -= step;
      }
      neglectedDuringDecay = false;
      return { seconds: realSec, before };
    }

    // Ce qu'elle raconte en arrivant dans le pré
    function arrivalLine(rest) {
      const who = name.value || "Elle";
      if (!hatched.value) return "";
      if (!rest || rest.seconds < REST_TALK_MIN) return pickOne([`Coucou ! Me revoilà dans le pré !`, `Youpi, c'est mon tour !`, `${who} est là !`]);
      const b = rest.before;
      if (b.hunger - hunger.value > 12) return "Pendant que je me reposais, j'ai eu un petit creux…";
      if (b.fun - fun.value > 12) return "Pendant que je me reposais, je me suis un peu ennuyée. On joue ?";
      if (energy.value - b.energy > 10) return "Pendant que je me reposais, j'ai fait une super sieste au chaud !";
      return pickOne(["Je me suis bien reposée au chaud ! Tu m'as manqué.", "Pendant que je me reposais, j'ai rêvé de toi !", "Quelle bonne sieste ! Coucou !"]);
    }
    const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

    // Installe une créature du roster dans le pré (les refs du store prennent ses valeurs)
    function loadEntry(entry, now) {
      const fresh = freshCreatureData(now);
      const data = entry.data || {};
      for (const k of PER_CREATURE_KEYS) perRefs[k].value = clone(k in data ? data[k] : fresh[k]);
      activeId.value = entry.id;
      try {
        const i = inv();
        i.outfit = { ...Object.fromEntries(SLOTS.map((k) => [k, null])), ...(entry.outfit || {}) };
        i.stats = { ...i.stats, tastesSeen: [...(entry.tastesSeen || [])] };
      } catch { /* Sac indisponible */ }
      away.value = null;
      neglectedDuringDecay = false;
      let rest = null;
      if (hatched.value && onboardStep.value >= 6) {
        rest = restCatchUp(entry.restingSince || lastUpdate.value, now);
        if (rest && rest.seconds >= REST_TALK_MIN) addJournal("maison", "De retour dans le pré après un bon repos au chaud.", "solar:home-smile-bold-duotone");
        wish.value = null;
        nextWishAt.value = now + (rand(30, 60) * 1000) / (speed.value > 1 ? speed.value : 1);
      }
      lastUpdate.value = now;
      tick.value = now;
      patchEntry(entry.id, { restingSince: 0 });
      evalStage();
      return rest;
    }

    // Fait venir une autre créature dans le pré. Renvoie { ok, reason?, line }
    function switchTo(id) {
      ensureRoster();
      if (id === activeId.value) return { ok: false, reason: "Elle est déjà dans le pré !" };
      const entry = roster.value.find((e) => e.id === id);
      if (!entry) return { ok: false, reason: "Elle n'est pas dans la maison." };
      if (activeActivity.value) return { ok: false, reason: "Pas pendant une activité !" };
      const now = Date.now();
      stashActive(now);
      const rest = loadEntry(roster.value.find((e) => e.id === id), now);
      return { ok: true, line: arrivalLine(rest) };
    }

    // Adopte un œuf de mochignome dans une place libre : il arrive dans le pré, à faire éclore
    function adoptEgg() {
      ensureRoster();
      if (!canAdopt.value) return { ok: false, reason: roster.value.length >= slotsOpen.value ? "Pas de place libre dans la maison." : "Pas tout de suite." };
      if (activeActivity.value) return { ok: false, reason: "Pas pendant une activité !" };
      const now = Date.now();
      stashActive(now);
      const entry = { id: newCreatureId(), createdAt: now, data: freshCreatureData(now), outfit: null, tastesSeen: [], portrait: "", restingSince: 0 };
      roster.value = [...roster.value, entry];
      loadEntry(entry, now);
      return { ok: true, id: entry.id };
    }

    // Une nouvelle place s'ouvre : une carte (UnlockCard, clé « maison »), une à la fois
    function checkSlots(now) {
      if (!hatched.value || onboardStep.value < 6) return;
      if (slotsOpen.value <= slotsSeen.value || cardPending(now)) return;
      slotsSeen.value = slotsOpen.value;
      unlockEvent.value = { key: "maison", label: "Nouvelle place", icon: "solar:home-smile-bold-duotone", at: now, seen: false };
      addJournal("maison", "Une nouvelle place s'est libérée dans la maison !", "solar:home-smile-bold-duotone");
    }

    function payWelcomeGift() {
      if (!(welcomeGift.value > 0)) return;
      const n = welcomeGift.value;
      welcomeGift.value = 0;
      try { inv().earn(n, "Cadeau : la boutique est ouverte !"); } catch { welcomeGift.value = n; }
    }

    function startDecay() {
      migrate();
      if (!decayTimer && (!lastUpdate.value || Date.now() - lastUpdate.value > SESSION_GAP_MS)) newSession();
      else sessionStartPlay = playMs.value;
      if (needQuestUpgrade) { needQuestUpgrade = false; upgradeQuests(); }
      // cadeau de bienvenue des anciennes parties : versé quand la boutique ouvre
      if (features.value.boutique) payWelcomeGift();
      if (!bornAt.value) bornAt.value = hatchedAt.value || Date.now();
      // filet de sécurité : une créature éclose sans apparence garde l'original
      if (hatched.value && !appearance.value) appearance.value = { ...ORIGINAL_APPEARANCE };
      if (decayTimer) return;
      awaySeconds.value = lastUpdate.value ? Math.max(0, (Date.now() - lastUpdate.value) / 1000) : 0;
      if (typeof window !== "undefined") {
        const s = Number(new URLSearchParams(window.location.search).get("vitesse"));
        speed.value = s > 0 ? Math.min(s, 3600) : 1;
      }
      checkDailyVisit();
      if (hatched.value && !nextWishAt.value && onboardStep.value >= 6) scheduleWish(Date.now());
      catchUp();
      decayTimer = setInterval(catchUp, 1000);
      if (typeof document !== "undefined" && !visibilityBound) {
        visibilityBound = true;
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
          if (hiddenAt && Date.now() - hiddenAt > SESSION_GAP_MS) newSession();
          hiddenAt = 0;
          lastPlayTick = 0; // le temps caché ne compte pas comme du jeu
          if (document.visibilityState === "visible") catchUp();
        });
      }
    }

    function dismissAway() { away.value = null; }

    // ---------- prévisions pour les rappels ----------
    function predictNext(now = Date.now()) {
      if (!hatched.value || onboardStep.value < 6) return [];
      const who = name.value || "Elle";
      const limit = now + 36 * 3600000;
      const out = [];
      const push = (type, at, title, body) => { if (at > now && at <= limit) out.push({ type, at, title, body }); };

      if (isSleeping.value && energy.value < 100) {
        const night = dayPhase(new Date(now)) === "night";
        const h = (100 - energy.value) / (RATES.energySleeping * (night ? 1.5 : 1));
        push("reveil", now + h * 3600000, `${who} se réveille`, `${who} a bien dormi et aimerait te dire bonjour.`);
      }
      if (hunger.value > 25) {
        const rate = RATES.hunger * (1 + 0.4 * tr("gourmande")) * (isSleeping.value ? SLEEP_FACTOR : 1);
        push("faim", now + ((hunger.value - 25) / rate) * 3600000, `${who} a un petit creux`, `Son ventre commence à gargouiller. Un petit repas ?`);
      }
      if (!wish.value && nextWishAt.value) {
        push("envie", Math.max(nextWishAt.value, now + 20 * 60000), `${who} a une envie`, `${who} a une petite idée de jeu.`);
      }
      const at = (h, min, plusDays = 0) => { const d = new Date(now); d.setDate(d.getDate() + plusDays); d.setHours(h, min, 0, 0); return d.getTime(); };
      push("bonjour", at(9, 0) > now ? at(9, 0) : at(9, 0, 1), `Bonjour de la part de ${who}`, `Un nouveau jour se lève sur le pré de ${who} !`);
      push("soir", at(19, 0) > now ? at(19, 0) : at(19, 0, 1), `Un peu de tendresse ce soir`, `${who} aimerait un peu de tendresse avant de dormir.`);
      return out.sort((a, b) => a.at - b.at);
    }

    return {
      schema, name, initName, hunger, cleanliness, fun, energy, health, isSleeping, lastUpdate, speed,
      traits, neglectedAt, isSulking, xp, bornAt, counters, unlocked, palette, ui,
      lastVisitDay, streak, pendingBonus, awaySeconds,
      hatched, eggHeat, onboardStep, hatchedAt, stage, cooldowns, wish, wishesDone, illness, exhausted,
      quests, journal, bestStreak, totalDays, jokers, nextWishAt, lastWishId, surpriseLog,
      away, tick, level, stageInfo, unlockedPages, welcomeGift, pendingBonusCoins,
      features, tasteSeed, tastes, appearance, playsToday, mealBoostUntil, mealBoostActive, playDaysRewarded, returnGift, unlockEvent,
      playMs, sessions, revealAt, ackUnlock,
      questsAllDone, questBonusReady, idleSuggestion,
      rename, resetGame, countPhoto, countGesture, claimBonus, claimQuest, claimQuestBonus, claimReturnGift, addJournal, countEvent,
      canActivity, applyActivity, canEatMeal, eatMeal, playFeel, playsOf,
      hasFeature, unlockFeature, checkUnlocks, onEquip, tasteReactionFor, showReaction, claimMastery, fulfillWish,
      canAct, applyAction, hatch, tapEgg, setOnboardStep, finishOnboarding, dismissAway,
      wakeUp, startSleeping, startDecay, predictNext, migrate,
      roster, activeId, slotsSeen, topLevel, slotsOpen, veteran, house, canAdopt, setPortrait, switchTo, adoptEgg,
    };
  },
  {
    persist: {
      pick: [
        "schema", "name", "hunger", "cleanliness", "fun", "energy", "health", "isSleeping", "lastUpdate", "traits",
        "neglectedAt", "xp", "bornAt", "counters", "unlocked", "palette", "ui", "lastVisitDay", "streak", "pendingBonus",
        "hatched", "eggHeat", "onboardStep", "hatchedAt", "stage", "cooldowns", "wish", "wishesDone", "illness",
        "exhausted", "quests", "journal", "bestStreak", "totalDays", "jokers", "nextWishAt", "lastWishId", "surpriseLog",
        "welcomeGift", "features", "tasteSeed", "playsToday", "mealBoostUntil", "playDaysRewarded", "returnGift",
        "playMs", "sessions", "revealAt", "unlockEvent", "appearance", "roster", "activeId", "slotsSeen",
      ],
      afterHydrate: (ctx) => { ctx.store.migrate?.(); },
    },
  }
);
