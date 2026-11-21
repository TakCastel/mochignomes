// stores/useInventoryStore.js
// Le « Sac » : monnaies, vêtements (avec leurs couleurs), tenue portée,
// frigo (ingrédients et repas prêts), objets d'activité, records, collection, goûts révélés.
// `gems` s'affiche « Étoiles » : elles se gagnent en jouant, jamais achetées.
// L'inventaire est conservé quand on recommence un œuf (seuls les goûts révélés repartent à zéro).
// Plusieurs créatures (la maison) : le Sac est PARTAGÉ. Seuls `outfit` (sa tenue) et
// `stats.tastesSeen` (ses goûts découverts) sont ceux de la créature du pré : le store
// principal les échange quand une autre vient (useTamagotchiStore switchTo / adoptEgg).
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { gameBus, gameToast } from "~/composables/useCreatureMood";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import {
  SLOTS, V1_ITEMS, SETS, V1_INGREDIENTS, TOTAL_VARIANTS,
  itemById, colorByKey, ingredientById, recipeById, propById, setById, itemColors,
  priceFor, discounted, offerDiscount, shopOffersForDay, setProgress, collectionCount, missingIngredients,
} from "~/lib/catalog";
import { TASTE_KEYS, tasteLabel } from "~/lib/tastes";

const safeToast = (text, icon) => { try { gameToast(text, icon); } catch { /* hors navigateur */ } };
const coinFx = (coins = 0, gems = 0) => { try { gameBus.coinFx = { coins, gems, id: Math.random() }; } catch { /* hors navigateur */ } };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const emptyOutfit = () => Object.fromEntries(SLOTS.map((s) => [s, null]));
// tastesSeen : clés de TASTE_KEYS révélées (carnet « Ce qu'elle aime ») ; mastery : maîtrises obtenues
const freshStats = () => ({ mealsCooked: 0, activitiesPlayed: 0, best: {}, coinsEarned: 0, gemsEarned: 0, itemsBought: 0, chests: 0, tastesSeen: [], mastery: [] });
const START = () => ({ coins: 0, gems: 0, owned: {}, pantry: {}, props: [], seen: [] });

// Le main store compte les événements des défis (cuisine, collection...)
function countEvent(key, n = 1) {
  try { useTamagotchiStore().countEvent(key, n); } catch { /* store indisponible */ }
}
function playerLevel() {
  // niveau le plus haut de la maison : la boutique ne se reverrouille pas pour un bébé
  try { const s = useTamagotchiStore(); return s.topLevel || s.level || 1; } catch { return 1; }
}

export const useInventoryStore = defineStore(
  "inventory",
  () => {
    // départ : rien. Le ballon, le t-shirt et le kit crêpes sont offerts au fil des déblocages
    // (store principal : unlockFeature → grantStarterKit)
    const coins = ref(START().coins);
    const gems = ref(START().gems);
    const owned = ref(START().owned);
    const outfit = ref(emptyOutfit());
    const pantry = ref(START().pantry);
    const meals = ref({});
    const props = ref(START().props);
    const seenItems = ref(START().seen);
    const shop = ref({ day: "", daily: null, offers: [], ingredients: [] });
    const stats = ref(freshStats());
    const setsClaimed = ref([]);
    const recipesKnown = ref([]); // recettes découvertes (cuisinées au moins une fois)
    const recipeStars = ref({}); // meilleure note obtenue par recette
    const lastChest = ref(""); // jour du dernier coffre gratuit

    // ---------- dérivés ----------
    const collected = computed(() => collectionCount(owned.value));
    const totalVariants = TOTAL_VARIANTS;
    const itemsOwnedCount = computed(() => V1_ITEMS.filter((i) => (owned.value[i.id] || []).length).length);
    const tastesSeen = computed(() => stats.value.tastesSeen || []);
    const unseen = computed(() => {
      const seen = new Set(seenItems.value);
      const out = [];
      for (const [id, colors] of Object.entries(owned.value)) for (const c of colors) if (!seen.has(`${id}:${c}`)) out.push(`${id}:${c}`);
      return out;
    });
    const unseenCount = computed(() => unseen.value.length);
    // le coffre se réarme chaque jour (tick du main store = horloge réactive)
    const chestReady = computed(() => {
      try { void useTamagotchiStore().tick; } catch { /* rien */ }
      return lastChest.value !== todayKey();
    });
    const setsReady = computed(() => SETS.map((x) => x.id)
      .filter((id) => !setsClaimed.value.includes(id) && setProgress(id, owned.value).done));
    const pantryCount = computed(() => Object.values(pantry.value).reduce((a, b) => a + b, 0));
    const mealsCount = computed(() => Object.values(meals.value).reduce((a, b) => a + b, 0));

    // ---------- monnaies ----------
    function earn(n, reason) {
      n = Math.round(Number(n) || 0);
      if (n <= 0) return 0;
      coins.value += n;
      stats.value.coinsEarned = (stats.value.coinsEarned || 0) + n;
      coinFx(n, 0);
      if (reason) safeToast(`+${n} pièces · ${reason}`, "solar:dollar-minimalistic-bold-duotone");
      return n;
    }
    function spend(n) {
      n = Math.round(Number(n) || 0);
      if (n < 0 || coins.value < n) return false;
      coins.value -= n;
      return true;
    }
    function earnGems(n, reason) {
      n = Math.round(Number(n) || 0);
      if (n <= 0) return 0;
      gems.value += n;
      stats.value.gemsEarned = (stats.value.gemsEarned || 0) + n;
      coinFx(0, n);
      if (reason) safeToast(`+${n} Étoile${n > 1 ? "s" : ""} · ${reason}`, "solar:star-bold-duotone");
      return n;
    }
    function spendGems(n) {
      n = Math.round(Number(n) || 0);
      if (n < 0 || gems.value < n) return false;
      gems.value -= n;
      return true;
    }
    function canAfford(price) {
      return price.currency === "gems" ? gems.value >= price.amount : coins.value >= price.amount;
    }

    // ---------- vêtements ----------
    function ownsColor(id, color) { return (owned.value[id] || []).includes(color); }
    function ownsItem(id) { return (owned.value[id] || []).length > 0; }
    function grantItem(id, color) {
      const item = itemById(id);
      if (!item || !item.colors.includes(color) || ownsColor(id, color)) return false;
      owned.value = { ...owned.value, [id]: [...(owned.value[id] || []), color] };
      countEvent("collection");
      return true;
    }
    function markSeen(key) {
      const keys = [].concat(key);
      const set = new Set(seenItems.value);
      let changed = false;
      for (const k of keys) if (!set.has(k)) { set.add(k); changed = true; }
      if (changed) seenItems.value = [...set];
    }
    function markAllSeen() { markSeen(unseen.value); }
    function isNew(id, color) {
      if (color) return ownsColor(id, color) && !seenItems.value.includes(`${id}:${color}`);
      return (owned.value[id] || []).some((c) => !seenItems.value.includes(`${id}:${c}`));
    }

    // Équipe un vêtement possédé. Renvoie false si impossible, sinon { ok: true, reaction }
    // (reaction = sa réaction selon ses goûts, voir lib/tastes.js ; null si déjà porté).
    // { quiet: true } : pas de réaction (essayage, tenue au hasard).
    function equip(slot, id, color, { quiet = false } = {}) {
      const item = itemById(id);
      if (!item || item.slot !== slot || !ownsColor(id, color)) return false;
      const cur = outfit.value[slot];
      if (cur && cur.id === id && cur.color === color) return { ok: true, reaction: null };
      outfit.value = { ...outfit.value, [slot]: { id, color } };
      markSeen(`${id}:${color}`);
      countEvent("habillage");
      let reaction = null;
      if (!quiet) { try { reaction = useTamagotchiStore().onEquip(id, color); } catch { /* store indisponible */ } }
      return { ok: true, reaction };
    }
    function unequip(slot) {
      if (!outfit.value[slot]) return false;
      outfit.value = { ...outfit.value, [slot]: null };
      return true;
    }
    // Tenue au hasard parmi les vêtements possédés (un emplacement peut rester vide)
    function randomOutfit() {
      const next = emptyOutfit();
      for (const slot of SLOTS) {
        const mine = V1_ITEMS.filter((i) => i.slot === slot && ownsItem(i.id));
        if (!mine.length || Math.random() < 0.25) continue;
        const item = mine[Math.floor(Math.random() * mine.length)];
        const colors = owned.value[item.id];
        next[slot] = { id: item.id, color: colors[Math.floor(Math.random() * colors.length)] };
      }
      outfit.value = next;
      countEvent("habillage");
      return next;
    }

    // ---------- boutique ----------
    // Catalogue V1 complet toujours achetable (cadenas de niveau) + « coloris du jour » à -30 %
    function ensureShop() {
      const day = todayKey();
      if (shop.value.day !== day || !("daily" in shop.value)) shop.value = shopOffersForDay(day, playerLevel());
      return shop.value;
    }
    // Coloris du jour : { itemId, color, discount } | null
    const dailyColor = computed(() => {
      try { void useTamagotchiStore().tick; } catch { /* rien */ }
      const day = todayKey();
      return (shop.value.day === day && "daily" in shop.value ? shop.value.daily : shopOffersForDay(day, playerLevel()).daily) || null;
    });
    // Prix réel (remise du jour comprise) d'une couleur d'item. currency : "coins" | "gems" (Étoiles)
    function itemPrice(id, color) {
      ensureShop();
      return discounted(priceFor(id, color, owned.value[id] || []), offerDiscount(shop.value, id, color));
    }
    function itemLock(id) {
      const item = itemById(id);
      if (!item) return "Introuvable.";
      if (item.soon) return "Bientôt !";
      const lvl = playerLevel();
      if (lvl < item.minLevel) return `Disponible au niveau ${item.minLevel}.`;
      return null;
    }
    function buyItem(id, color) {
      const item = itemById(id);
      if (!item || !colorByKey(color) || !itemColors(item).includes(color)) return { ok: false, reason: "Cette couleur n'existe pas." };
      if (ownsColor(id, color)) return { ok: false, reason: "Tu l'as déjà !" };
      const lock = itemLock(id);
      if (lock) return { ok: false, reason: lock };
      const price = itemPrice(id, color);
      const paid = price.currency === "gems" ? spendGems(price.amount) : spend(price.amount);
      if (!paid) return { ok: false, reason: price.currency === "gems" ? "Pas assez d'Étoiles." : "Pas assez de pièces.", price };
      grantItem(id, color);
      stats.value.itemsBought = (stats.value.itemsBought || 0) + 1;
      return { ok: true, price, reason: "" };
    }
    function buyIngredient(id, n = 1) {
      const ing = ingredientById(id);
      n = Math.max(1, Math.round(Number(n) || 1));
      if (!ing || ing.soon) return { ok: false, reason: "Ingrédient introuvable." };
      const cost = ing.price * n;
      if (!spend(cost)) return { ok: false, reason: "Pas assez de pièces.", cost };
      addIngredient(id, n);
      return { ok: true, cost, reason: "" };
    }
    // Achète tous les ingrédients manquants d'une recette
    function buyMissingFor(recipeId) {
      const miss = missingIngredients(recipeId, pantry.value);
      const cost = Object.entries(miss).reduce((s, [id, n]) => s + (ingredientById(id)?.price || 0) * n, 0);
      if (!cost) return { ok: true, cost: 0, reason: "" };
      if (!spend(cost)) return { ok: false, reason: "Pas assez de pièces.", cost };
      for (const [id, n] of Object.entries(miss)) addIngredient(id, n);
      return { ok: true, cost, reason: "" };
    }
    function buyProp(id) {
      const p = propById(id);
      if (!p || p.soon) return { ok: false, reason: "Objet introuvable." };
      if (hasProp(id)) return { ok: false, reason: "Tu l'as déjà !" };
      if (playerLevel() < p.minLevel) return { ok: false, reason: `Disponible au niveau ${p.minLevel}.` };
      if (!spend(p.price)) return { ok: false, reason: "Pas assez de pièces.", cost: p.price };
      grantProp(id);
      return { ok: true, cost: p.price, reason: "" };
    }

    // ---------- frigo ----------
    function addIngredient(id, n = 1) {
      if (!ingredientById(id) || n <= 0) return;
      pantry.value = { ...pantry.value, [id]: (pantry.value[id] || 0) + n };
    }
    function hasIngredients(map) {
      return Object.entries(map || {}).every(([id, n]) => (pantry.value[id] || 0) >= n);
    }
    function useIngredients(map) {
      if (!hasIngredients(map)) return false;
      const next = { ...pantry.value };
      for (const [id, n] of Object.entries(map)) {
        next[id] -= n;
        if (next[id] <= 0) delete next[id];
      }
      pantry.value = next;
      return true;
    }
    function addMeal(id, n = 1) {
      if (!recipeById(id) || n <= 0) return;
      meals.value = { ...meals.value, [id]: (meals.value[id] || 0) + n };
    }
    function useMeal(id) {
      if (!(meals.value[id] > 0)) return false;
      const next = { ...meals.value, [id]: meals.value[id] - 1 };
      if (next[id] <= 0) delete next[id];
      meals.value = next;
      return true;
    }
    function canCook(recipeId) {
      const r = recipeById(recipeId);
      if (!r || r.soon) return { ok: false, reason: "Recette introuvable.", missing: {} };
      if (playerLevel() < r.minLevel) return { ok: false, reason: `Recette débloquée au niveau ${r.minLevel}.`, missing: {} };
      const missing = missingIngredients(recipeId, pantry.value);
      if (Object.keys(missing).length) return { ok: false, reason: "Il manque des ingrédients.", missing };
      return { ok: true, reason: "", missing: {} };
    }
    // Cuisine une recette (après le mini-jeu). eatNow : la servir tout de suite si elle a faim,
    // sinon (ou si elle n'a pas faim) le plat rejoint le frigo.
    // Renvoie { ok, reason, firstTime, stars, served, meal? (résultat de eatMeal) }
    function cook(recipeId, stars = 1, { eatNow = false } = {}) {
      const c = canCook(recipeId);
      if (!c.ok) return { ok: false, reason: c.reason, missing: c.missing, firstTime: false, stars: 0, served: false };
      const r = recipeById(recipeId);
      useIngredients(r.ingredients);
      stars = Math.max(1, Math.min(3, Math.round(Number(stars) || 1)));
      const firstTime = !recipesKnown.value.includes(recipeId);
      if (firstTime) recipesKnown.value = [...recipesKnown.value, recipeId];
      const firstThree = stars === 3 && (recipeStars.value[recipeId] || 0) < 3;
      recipeStars.value = { ...recipeStars.value, [recipeId]: Math.max(recipeStars.value[recipeId] || 0, stars) };
      if (firstThree) { try { useTamagotchiStore().claimMastery("recette-3"); } catch { /* store indisponible */ } }
      stats.value.mealsCooked = (stats.value.mealsCooked || 0) + 1;
      countEvent("cuisine");
      if (firstTime) earn(10, `Nouvelle recette : ${r.label}`);
      let served = false, meal = null;
      if (eatNow) {
        meal = useTamagotchiStore().eatMeal(recipeId, stars);
        served = !!meal?.ok;
      }
      if (!served) addMeal(recipeId, 1);
      return { ok: true, reason: "", firstTime, stars, served, meal };
    }
    // Sert un plat du frigo (avec la meilleure note obtenue pour cette recette)
    // Une recette déjà réussie à 3★ se refait d'un geste (« comme d'habitude »)
    const canQuickCook = (recipeId) => (recipeStars.value[recipeId] || 0) >= 3;
    function serveMeal(recipeId) {
      if (!(meals.value[recipeId] > 0)) return { ok: false, reason: "Plus de plat de ce genre au frigo." };
      const main = useTamagotchiStore();
      const can = main.canEatMeal(recipeId);
      if (!can.ok) return { ok: false, reason: can.reason };
      useMeal(recipeId);
      return main.eatMeal(recipeId, recipeStars.value[recipeId] || 1);
    }

    // ---------- objets d'activité, records ----------
    function grantProp(id) {
      if (!propById(id) || props.value.includes(id)) return false;
      props.value = [...props.value, id];
      return true;
    }
    function hasProp(id) { return !id || props.value.includes(id); }
    function recordScore(activityId, score) {
      score = Math.max(0, Math.round(Number(score) || 0));
      const prev = stats.value.best?.[activityId] || 0;
      const isRecord = score > prev;
      stats.value.best = { ...(stats.value.best || {}), [activityId]: Math.max(prev, score) };
      stats.value.activitiesPlayed = (stats.value.activitiesPlayed || 0) + 1;
      return { best: Math.max(prev, score), isRecord: isRecord && prev > 0, firstScore: prev === 0 && score > 0 };
    }

    // ---------- collections ----------
    function claimSet(setId) {
      const set = setById(setId);
      if (!set) return { ok: false, reason: "Collection introuvable." };
      if (setsClaimed.value.includes(setId)) return { ok: false, reason: "Déjà récupérée." };
      if (!setProgress(setId, owned.value).done) return { ok: false, reason: "Collection incomplète." };
      setsClaimed.value = [...setsClaimed.value, setId];
      earn(set.reward.coins);
      earnGems(set.reward.gems);
      safeToast(`Collection ${set.label} : +${set.reward.coins} pièces, +${set.reward.gems} Étoiles`, set.icon);
      try { useTamagotchiStore().addJournal("collection", `Collection ${set.label} complétée !`, set.icon); } catch { /* rien */ }
      return { ok: true, coins: set.reward.coins, gems: set.reward.gems };
    }

    // ---------- coffre gratuit du jour ----------
    // Renvoie { ok, kind: "coins"|"ingredients"|"item", coins?, ingredients?, item?, label }
    function claimChest() {
      if (!chestReady.value) return { ok: false, reason: "Reviens demain pour un nouveau coffre !" };
      lastChest.value = todayKey();
      stats.value.chests = (stats.value.chests || 0) + 1;
      const roll = Math.random();
      const lvl = playerLevel();
      if (roll < 0.2) {
        const pool = [];
        for (const it of V1_ITEMS) {
          if (it.premium || it.rarity !== "commun" || it.minLevel > lvl) continue;
          for (const c of itemColors(it)) if (!colorByKey(c).premium && !ownsColor(it.id, c)) pool.push([it.id, c]);
        }
        if (pool.length) {
          const [id, color] = pool[Math.floor(Math.random() * pool.length)];
          grantItem(id, color);
          const label = `${itemById(id).label} ${colorByKey(color).label.toLowerCase()}`;
          safeToast(`Coffre : ${label} !`, "solar:gift-bold-duotone");
          return { ok: true, kind: "item", item: { id, color }, label };
        }
      }
      if (roll < 0.5) {
        const got = {};
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          const ing = V1_INGREDIENTS[Math.floor(Math.random() * V1_INGREDIENTS.length)];
          got[ing.id] = (got[ing.id] || 0) + 1 + Math.floor(Math.random() * 2);
        }
        for (const [id, q] of Object.entries(got)) addIngredient(id, q);
        const label = Object.entries(got).map(([id, q]) => `${q} ${ingredientById(id).label.toLowerCase()}`).join(", ");
        safeToast(`Coffre : ${label}`, "solar:gift-bold-duotone");
        return { ok: true, kind: "ingredients", ingredients: got, label };
      }
      const amount = 15 + Math.floor(Math.random() * 26) + Math.min(20, lvl * 2);
      earn(amount, "Coffre du jour");
      return { ok: true, kind: "coins", coins: amount, label: `${amount} pièces` };
    }

    // ---------- goûts révélés (carnet « Ce qu'elle aime ») ----------
    // key : une clé de TASTE_KEYS. Renvoie true si c'est une découverte (toast discret).
    function revealTaste(key, tastes = null) {
      if (!TASTE_KEYS.includes(key)) return false;
      const seen = stats.value.tastesSeen || [];
      if (seen.includes(key)) return false;
      stats.value = { ...stats.value, tastesSeen: [...seen, key] };
      const text = tastes ? tasteLabel(key, tastes) : "";
      safeToast(text ? `Découverte · ${text}` : "Tu as découvert un de ses goûts !", "solar:heart-bold-duotone");
      return true;
    }
    const isTasteSeen = (key) => (stats.value.tastesSeen || []).includes(key);
    // Nouvel œuf : nouveaux goûts à redécouvrir
    function resetTastes() { stats.value = { ...stats.value, tastesSeen: [] }; }

    // ---------- maîtrises (sources d'Étoiles) ----------
    const hasMastery = (id) => (stats.value.mastery || []).includes(id);
    function markMastery(id) {
      if (hasMastery(id)) return false;
      stats.value = { ...stats.value, mastery: [...(stats.value.mastery || []), id] };
      return true;
    }

    // ---------- cadeaux de découverte (appelés par le store principal au déblocage) ----------
    // kind : "ballon" | "tele" | "baskets" (objet offert), "tshirt" (opts.color, équipé),
    //        "crepes" (farine + œuf + lait), "etoiles" (opts.gems, défaut 3).
    // Renvoie ce qui a été donné, ou null si rien (déjà possédé).
    function grantStarterKit(kind, opts = {}) {
      switch (kind) {
        case "ballon": case "tele": case "baskets":
          return grantProp(kind) ? { prop: kind } : null;
        case "tshirt": {
          const color = itemColors("tshirt").includes(opts.color) ? opts.color : "vert";
          const fresh = grantItem("tshirt", color);
          if (!outfit.value.haut) outfit.value = { ...outfit.value, haut: { id: "tshirt", color } };
          return fresh ? { item: "tshirt", color } : null;
        }
        case "crepes":
          addIngredient("farine", 1); addIngredient("oeuf", 1); addIngredient("lait", 1);
          return { ingredients: { farine: 1, oeuf: 1, lait: 1 } };
        case "etoiles": {
          const n = opts.gems ?? 3;
          earnGems(n);
          return { gems: n };
        }
        default: return null;
      }
    }

    // Remet le Sac à zéro (outil de développement ; une nouvelle partie GARDE l'inventaire)
    function resetInventory() {
      const st = START();
      coins.value = st.coins; gems.value = st.gems;
      owned.value = st.owned; outfit.value = emptyOutfit();
      pantry.value = st.pantry; meals.value = {};
      props.value = st.props; seenItems.value = st.seen;
      shop.value = { day: "", daily: null, offers: [], ingredients: [] }; stats.value = freshStats();
      setsClaimed.value = []; recipesKnown.value = []; recipeStars.value = {}; lastChest.value = "";
    }

    return {
      coins, gems, owned, outfit, pantry, meals, props, seenItems, shop, stats, setsClaimed, recipesKnown, recipeStars, lastChest,
      collected, totalVariants, itemsOwnedCount, unseen, unseenCount, chestReady, setsReady, pantryCount, mealsCount,
      tastesSeen, dailyColor,
      earn, spend, earnGems, spendGems, canAfford,
      ownsColor, ownsItem, grantItem, markSeen, markAllSeen, isNew, equip, unequip, randomOutfit,
      ensureShop, itemPrice, itemLock, buyItem, buyIngredient, buyMissingFor, buyProp,
      addIngredient, hasIngredients, useIngredients, addMeal, useMeal, canCook, canQuickCook, cook, serveMeal,
      grantProp, hasProp, recordScore, claimSet, claimChest,
      revealTaste, isTasteSeen, resetTastes, hasMastery, markMastery, grantStarterKit, resetInventory,
    };
  },
  {
    persist: {
      pick: [
        "coins", "gems", "owned", "outfit", "pantry", "meals", "props", "seenItems", "shop", "stats",
        "setsClaimed", "recipesKnown", "recipeStars", "lastChest",
      ],
      afterHydrate: (ctx) => {
        // sauvegardes incomplètes : on complète sans rien perdre
        const s = ctx.store;
        s.outfit = { ...Object.fromEntries(SLOTS.map((k) => [k, null])), ...(s.outfit || {}) };
        s.stats = {
          ...freshStats(), ...(s.stats || {}), best: { ...(s.stats?.best || {}) },
          tastesSeen: Array.isArray(s.stats?.tastesSeen) ? s.stats.tastesSeen : [],
          mastery: Array.isArray(s.stats?.mastery) ? s.stats.mastery : [],
        };
        if (!Array.isArray(s.props)) s.props = [];
        if (!s.owned || typeof s.owned !== "object") s.owned = {};
        if (!s.pantry || typeof s.pantry !== "object") s.pantry = {};
      },
    },
  }
);
