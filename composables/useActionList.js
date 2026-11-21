import { computed, ref } from "vue";
import { gameBus, gameSay, gameCommand, openSheet, launchActivity, openKitchen, useCreatureMood } from "~/composables/useCreatureMood";
import * as growth from "~/lib/growth";
import { V1_ACTIVITIES, activityById } from "~/lib/catalog";
import { useInventoryStore } from "~/stores/useInventoryStore";

// Logique des actions du menu autour de la créature (InteractionRing).
// Chaque appel a son propre état d'animation (secousse, « +N », recharge).
const ACTION_UNLOCK_LEVEL = growth.ACTION_UNLOCK_LEVEL || { danser: 3 };

const SHORT = { foot: "Foot", course: "Course", tele: "Télé" };

// Icônes Fluent Emoji 3D (Microsoft, licence MIT), avec contour blanc façon autocollant
// (chatouiller.svg : plume Noto Emoji, Google, licence Apache 2.0)
const IMG = "/icons/actions/";
const ACT_IMG = { foot: "jouer", course: "course", tele: "tele" };

const BASE = [
  { key: "nourrir", label: "Manger", img: IMG + "manger.svg", icon: "solar:donut-bitten-bold-duotone", color: ["#ffcf8a", "#e8781c"], need: "hunger" },
  { key: "laver", label: "Laver", img: IMG + "laver.svg", icon: "solar:bath-bold-duotone", color: ["#a9dcff", "#2f86e0"], need: "cleanliness" },
  { key: "jouer", label: "Jouer", img: IMG + "jouer.svg", icon: "solar:football-bold-duotone", color: ["#b4ec9c", "#2a9a3a"], need: "fun" },
  { key: "calin", label: "Tendresse", img: IMG + "tendresse.svg", icon: "solar:hand-heart-bold-duotone", color: ["#f9bf94", "#ef3d6c"] },
  { key: "chatouiller", label: "Chatouiller", img: IMG + "chatouiller.svg", icon: "solar:hand-heart-bold-duotone", color: ["#ffd0e0", "#ff4f86"] },
  { key: "coucher", label: "Dodo", img: IMG + "dodo.svg", icon: "solar:bed-bold-duotone", color: ["#8f9fff", "#3a4bc0"], need: "energy" },
  { key: "soigner", label: "Soigner", img: IMG + "soigner.svg", icon: "solar:medical-kit-bold-duotone", color: ["#ff6d62", "#c42a24"], need: "health" },
  { key: "danser", label: "Danser", img: IMG + "danser.svg", icon: "solar:music-notes-bold-duotone", color: ["#e0c4ff", "#8048e0"] },
  { key: "photo", label: "Photo", img: IMG + "photo.svg", icon: "solar:camera-bold-duotone", color: ["#4fd2ca", "#0f6f69"] },
];

// Motifs de vibration par action (respecte le réglage « tamagotchi-haptics »)
const BUZZ = { calin: 10, chatouiller: 10, nourrir: [12, 30, 12], laver: [10, 20, 10], jouer: [10, 20, 10], soigner: 40, danser: [10, 20, 10], succes: [20, 40, 20] };
function buzz(pattern) {
  try {
    const v = localStorage.getItem("tamagotchi-haptics");
    if (v === "0" || v === "false" || v === "off") return;
  } catch { /* stockage indisponible */ }
  try { navigator.vibrate?.(pattern); } catch { /* non supporté */ }
}

export function useActionList() {
  const { store } = useCreatureMood();
  const inv = useInventoryStore();
  const tutoDone = computed(() => (store.onboardStep ?? 6) >= 6);
  const has = (k) => !!store.features?.[k];
  // Manger ouvre le choix goûter / plat (le tutoriel garde le goûter direct)
  const mealPath = computed(() => tutoDone.value && (has("cuisine") || inv.mealsCount > 0));

  // Activité à proposer à la place de « Jouer » : tout est plein, Jouer est grisé,
  // ou le ballon vient d'arriver et elle n'a jamais joué au foot (1re partie guidée)
  const suggestedActivity = computed(() => {
    void store.tick;
    if (!tutoDone.value || store.isSleeping || store.exhausted) return null;
    const w = store.wish;
    if (w?.action === "activite" && w.target && store.canActivity(w.target).ok) return w.target;
    const idle = store.idleSuggestion;
    if (idle?.kind === "activite") return idle.id;
    const ok = V1_ACTIVITIES.filter((a) => store.canActivity(a.id).ok);
    if (!ok.length) return null;
    if (has("ballon") && !(store.counters?.["activite:foot"] > 0) && ok.some((a) => a.id === "foot")) return "foot";
    const jouer = store.canAct?.("jouer");
    if (jouer && !jouer.ok && !(jouer.remaining > 0)) {
      const fav = ok.find((a) => a.id === store.tastes?.activity && inv.isTasteSeen("activity"));
      return (fav || ok.find((a) => a.id === "foot") || ok[0]).id;
    }
    return null;
  });
  // Plus faim du tout : Manger devient Cuisiner (préparer un plat pour plus tard)
  const suggestCooking = computed(() => mealPath.value && has("cuisine") && store.hunger > 90 && !store.isSleeping);
  const now = computed(() => store.tick || Date.now());

  // Anneau de recharge fluide : on fige UNE fois par recharge (clé readyAt) la durée totale
  // et le temps déjà écoulé, puis une animation CSS linéaire le remplit en continu
  // (le tick d'une seconde ne fait que décider s'il est encore affiché).
  const coolCache = new Map();
  function coolOf(key, c) {
    const hit = coolCache.get(key);
    if (hit && hit.readyAt === c.readyAt) return hit;
    const total = Math.max(c.cooldownMs, c.remaining);
    const elapsed = Math.max(0, total - Math.max(0, c.readyAt - Date.now()));
    const cool = { readyAt: c.readyAt, style: { "--dur": total + "ms", "--delay": -elapsed + "ms" } };
    coolCache.set(key, cool);
    return cool;
  }

  function stateOf(key) {
    if (key === "photo") return { reason: null, cool: null, locked: false };
    const needLevel = ACTION_UNLOCK_LEVEL?.[key];
    if (needLevel && store.level < needLevel) {
      return { reason: `Je saurai danser au niveau ${needLevel} !`, cool: null, locked: true };
    }
    if (key === "coucher" && store.isSleeping) return { reason: null, cool: null, locked: false };
    void now.value; // dépendance : l'anneau disparaît à la fin de la recharge
    const c = store.canAct?.(key);
    if (!c || c.ok) return { reason: null, cool: null, locked: false };
    const cool = c.cooldownMs > 0 && c.remaining > 0 ? coolOf(key, c) : null;
    // goûter en recharge : les plats du frigo restent accessibles par Manger
    if (key === "nourrir" && mealPath.value && c.remaining > 0 && !store.isSleeping) return { reason: null, cool, locked: false };
    return { reason: c.reason || "Encore un instant...", cool, locked: false };
  }

  const actions = computed(() =>
    BASE.map((a) => {
      if (a.key === "jouer" && suggestedActivity.value) {
        const act = activityById(suggestedActivity.value);
        const w = store.wish;
        return {
          ...a, label: SHORT[act.id] || act.label, icon: act.icon,
          img: ACT_IMG[act.id] ? IMG + ACT_IMG[act.id] + ".svg" : null, reason: null, cool: null, locked: false,
          activity: act.id, wanted: w?.action === "activite" && w.target === act.id, suggest: true,
          glow: gameBus.highlight?.action === a.key,
        };
      }
      if (a.key === "nourrir" && suggestCooking.value) {
        const wish = store.wish?.action === "repas" ? store.wish.target : "";
        return {
          ...a, label: "Cuisiner", icon: "solar:chef-hat-bold-duotone", img: IMG + "cuisiner.svg", reason: null, cool: null, locked: false,
          cook: wish || "", wanted: !!wish, glow: gameBus.highlight?.action === a.key,
        };
      }
      const wake = a.key === "coucher" && store.isSleeping;
      const st = stateOf(a.key);
      return {
        ...a,
        label: wake ? "Réveil" : a.label,
        icon: wake ? "solar:sun-bold-duotone" : a.icon,
        img: wake ? IMG + "reveil.svg" : a.img,
        color: wake ? ["#ffe58a", "#f29400"] : a.color,
        ...st,
        wanted: !st.reason && (store.wish?.action === a.key || (a.key === "nourrir" && mealPath.value && store.wish?.action === "repas")),
        glow: gameBus.highlight?.action === a.key,
      };
    })
  );

  // Une action pas encore apprise (Danser) n'apparaît pas du tout : pas de tuile cadenassée
  const shownActions = computed(() => actions.value.filter((a) => !a.locked));

  // UN seul appel à l'action à la fois : son envie > l'activité proposée > le besoin le plus bas
  const primary = computed(() => {
    const list = shownActions.value;
    const wish = list.find((a) => a.wanted && !a.reason);
    if (wish) return { key: wish.key, kind: "wanted" };
    const sug = list.find((a) => a.suggest);
    // simple suggestion (tout est plein, Jouer grisé…) : mise en avant douce, sans pastille
    if (sug) return { key: sug.key, kind: "best" };
    return best.value ? { key: best.value, kind: "best" } : null;
  });

  // Action conseillée : celle du besoin le plus bas (sans compter Soigner si elle va bien)
  const best = computed(() => {
    if (store.isSleeping) return null;
    let pick = null, low = 60;
    for (const a of actions.value) {
      if (!a.need || a.reason) continue;
      if (store[a.need] < low) { low = store[a.need]; pick = a.key; }
    }
    return pick;
  });

  const wiggling = ref(null);
  function wiggle(key) {
    wiggling.value = null;
    requestAnimationFrame(() => (wiggling.value = key));
    setTimeout(() => { if (wiggling.value === key) wiggling.value = null; }, 450);
  }

  // petits « +N » qui montent depuis la tuile
  const floats = ref([]);
  let floatId = 0;
  function addFloat(key, text, dx = 0) {
    const id = ++floatId;
    floats.value.push({ id, key, text, dx });
    setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== id)), 1100);
  }
  function showGains(key, res) {
    const parts = [];
    const g = res.gains || {};
    const top = Object.entries(g).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])[0];
    if (top) parts.push("+" + Math.round(top[1]));
    if (res.xp > 0) parts.push(`+${res.xp} xp`);
    parts.forEach((t, i) => setTimeout(() => addFloat(key, t, (i - 0.5) * 14), i * 140));
  }

  function press(a) {
    if (a.reason) {
      gameSay(a.reason);
      wiggle(a.key);
      return;
    }
    if (a.key === "photo") { buzz(12); return gameCommand("photo"); }
    if (a.activity) { buzz(12); return launchActivity(a.activity); }
    if (a.cook !== undefined) { buzz(12); return openKitchen(a.cook); }
    if (a.key === "nourrir" && mealPath.value) { buzz(12); return openSheet("manger"); }
    if (a.key === "coucher") {
      buzz(12);
      if (store.isSleeping) return store.wakeUp();
      const r = store.canAct?.("coucher");
      if (r && !r.ok) { gameSay(r.reason || "Je ne suis pas fatiguée !"); return wiggle(a.key); }
      return store.startSleeping();
    }
    const res = store.applyAction(a.key);
    if (!res || res.ok === false) {
      gameSay(res?.reason || "Pas maintenant...");
      wiggle(a.key);
      return;
    }
    buzz(BUZZ[a.key] || 12);
    showGains(a.key, res);
    if (res.levelUp || res.stageUp || res.wishDone) setTimeout(() => buzz(BUZZ.succes), 250);
  }

  return { store, BASE, actions, shownActions, primary, press, wiggling, floats, stateOf, tutoDone };
}
