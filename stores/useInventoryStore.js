// stores/useInventoryStore.js
// Le « Sac » : monnaies, vêtements (avec leurs couleurs), tenue portée,
// frigo (ingrédients et repas prêts), objets d'activité, records, collection.
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { gameBus, gameToast } from "~/composables/useCreatureMood";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import {
  SLOTS, ITEMS, SETS, INGREDIENTS, PREMIUM_LEVEL, TOTAL_VARIANTS,
  itemById, colorByKey, ingredientById, recipeById, propById, setById,
  priceFor, discounted, offerDiscount, shopOffersForDay, setProgress, collectionCount, missingIngredients,
} from "~/lib/catalog";

const safeToast = (text, icon) => { try { gameToast(text, icon); } catch { /* hors navigateur */ } };
const coinFx = (coins = 0, gems = 0) => { try { gameBus.coinFx = { coins, gems, id: Math.random() }; } catch { /* hors navigateur */ } };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const emptyOutfit = () => Object.fromEntries(SLOTS.map((s) => [s, null]));
const freshStats = () => ({ mealsCooked: 0, activitiesPlayed: 0, best: {}, coinsEarned: 0, gemsEarned: 0, itemsBought: 0, chests: 0 });

// Le main store compte les événements des défis (achat, habillage, cuisine...)
function countEvent(key, n = 1) {
  try { useTamagotchiStore().countEvent(key, n); } catch { /* store indisponible */ }
}
function playerLevel() {
  try { return useTamagotchiStore().level || 1; } catch { return 1; }
}

export const useInventoryStore = defineStore(
  "inventory",
  () => {
    const coins = ref(60);
    const gems = ref(5);
    const owned = ref({ tshirt: ["vert"] });
    const outfit = ref(emptyOutfit());
    const pantry = ref({ pomme: 1, fraise: 2, banane: 2, lait: 1 });
    const meals = ref({});
    const props = ref(["ballon"]);
    const seenItems = ref(["tshirt:vert"]);
    const shop = ref({ day: "", offers: [], ingredients: [] });
    const stats = ref(freshStats());
    const setsClaimed = ref([]);
    const recipesKnown = ref([]); // recettes découvertes (cuisinées au moins une fois)
    const recipeStars = ref({}); // meilleure note obtenue par recette
    const lastChest = ref(""); // jour du dernier coffre gratuit

    // ---------- dérivés ----------
    const collected = computed(() => collectionCount(owned.value));
    const totalVariants = TOTAL_VARIANTS;
    const itemsOwnedCount = computed(() => ITEMS.filter((i) => (owned.value[i.id] || []).length).length);
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
      if (reason) safeToast(`+${n} gemmes · ${reason}`, "solar:diamond-bold-duotone");
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

    function equip(slot, id, color) {
      const item = itemById(id);
      if (!item || item.slot !== slot || !ownsColor(id, color)) return false;
      const cur = outfit.value[slot];
      if (cur && cur.id === id && cur.color === color) return true;
      outfit.value = { ...outfit.value, [slot]: { id, color } };
      markSeen(`${id}:${color}`);
      countEvent("habillage");
      return true;
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
        const mine = ITEMS.filter((i) => i.slot === slot && ownsItem(i.id));
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
    function ensureShop() {
      const day = todayKey();
      if (shop.value.day !== day) shop.value = shopOffersForDay(day, playerLevel());
      return shop.value;
    }
    // Prix réel (remise du jour comprise) d'une couleur d'item
    function itemPrice(id, color) {
      ensureShop();
      return discounted(priceFor(id, color, owned.value[id] || []), offerDiscount(shop.value, id));
    }
    function itemLock(id) {
      const item = itemById(id);
      if (!item) return "Introuvable.";
      const lvl = playerLevel();
      if (item.premium && lvl < PREMIUM_LEVEL) return `Disponible au niveau ${PREMIUM_LEVEL}.`;
      if (lvl < item.minLevel) return `Disponible au niveau ${item.minLevel}.`;
      return null;
    }
    function buyItem(id, color) {
      const item = itemById(id);
      if (!item || !colorByKey(color) || !item.colors.includes(color)) return { ok: false, reason: "Cette couleur n'existe pas." };
      if (ownsColor(id, color)) return { ok: false, reason: "Tu l'as déjà !" };
      const lock = itemLock(id);
      if (lock) return { ok: false, reason: lock };
      const price = itemPrice(id, color);
      const paid = price.currency === "gems" ? spendGems(price.amount) : spend(price.amount);
      if (!paid) return { ok: false, reason: price.currency === "gems" ? "Pas assez de gemmes." : "Pas assez de pièces.", price };
      grantItem(id, color);
      stats.value.itemsBought = (stats.value.itemsBought || 0) + 1;
      countEvent("achat");
      return { ok: true, price, reason: "" };
    }
    function buyIngredient(id, n = 1) {
      const ing = ingredientById(id);
      n = Math.max(1, Math.round(Number(n) || 1));
      if (!ing) return { ok: false, reason: "Ingrédient introuvable." };
      const cost = ing.price * n;
      if (!spend(cost)) return { ok: false, reason: "Pas assez de pièces.", cost };
      addIngredient(id, n);
      countEvent("achat");
      return { ok: true, cost, reason: "" };
    }
    // Achète tous les ingrédients manquants d'une recette
    function buyMissingFor(recipeId) {
      const miss = missingIngredients(recipeId, pantry.value);
      const cost = Object.entries(miss).reduce((s, [id, n]) => s + (ingredientById(id)?.price || 0) * n, 0);
      if (!cost) return { ok: true, cost: 0, reason: "" };
      if (!spend(cost)) return { ok: false, reason: "Pas assez de pièces.", cost };
      for (const [id, n] of Object.entries(miss)) addIngredient(id, n);
      countEvent("achat");
      return { ok: true, cost, reason: "" };
    }
    function buyProp(id) {
      const p = propById(id);
      if (!p) return { ok: false, reason: "Objet introuvable." };
      if (hasProp(id)) return { ok: false, reason: "Tu l'as déjà !" };
      if (playerLevel() < p.minLevel) return { ok: false, reason: `Disponible au niveau ${p.minLevel}.` };
      if (!spend(p.price)) return { ok: false, reason: "Pas assez de pièces.", cost: p.price };
      grantProp(id);
      countEvent("achat");
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
      if (!r) return { ok: false, reason: "Recette introuvable.", missing: {} };
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
      recipeStars.value = { ...recipeStars.value, [recipeId]: Math.max(recipeStars.value[recipeId] || 0, stars) };
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
      earn(set.reward.coins, `Collection ${set.label}`);
      earnGems(set.reward.gems, `Collection ${set.label}`);
      try { useTamagotchiStore().addJournal("collection", `Collection ${set.label} complétée !`, set.icon); } catch { /* rien */ }
      return { ok: true, coins: set.reward.coins, gems: set.reward.gems };
    }

    // ---------- coffre gratuit du jour ----------
    // Renvoie { ok, kind: "coins"|"ingredients"|"item", coins?, ingredients?, item?, label }
    function claimChest() {
      if (!chestReady.value) return { ok: false, reason: "Reviens demain pour un nouveau coffre !" };
      lastChest.value = todayKey();
      stats.value.chests = (stats.value.chests || 0) + 1;
      countEvent("coffre");
      const roll = Math.random();
      const lvl = playerLevel();
      if (roll < 0.2) {
        const pool = [];
        for (const it of ITEMS) {
          if (it.premium || it.rarity !== "commun" || it.minLevel > lvl) continue;
          for (const c of it.colors) if (!colorByKey(c).premium && !ownsColor(it.id, c)) pool.push([it.id, c]);
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
          const ing = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)];
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

    function resetInventory() {
      coins.value = 60; gems.value = 5;
      owned.value = { tshirt: ["vert"] }; outfit.value = emptyOutfit();
      pantry.value = { pomme: 1, fraise: 2, banane: 2, lait: 1 }; meals.value = {};
      props.value = ["ballon"]; seenItems.value = ["tshirt:vert"];
      shop.value = { day: "", offers: [], ingredients: [] }; stats.value = freshStats();
      setsClaimed.value = []; recipesKnown.value = []; recipeStars.value = {}; lastChest.value = "";
    }

    return {
      coins, gems, owned, outfit, pantry, meals, props, seenItems, shop, stats, setsClaimed, recipesKnown, recipeStars, lastChest,
      collected, totalVariants, itemsOwnedCount, unseen, unseenCount, chestReady, setsReady, pantryCount, mealsCount,
      earn, spend, earnGems, spendGems, canAfford,
      ownsColor, ownsItem, grantItem, markSeen, markAllSeen, isNew, equip, unequip, randomOutfit,
      ensureShop, itemPrice, itemLock, buyItem, buyIngredient, buyMissingFor, buyProp,
      addIngredient, hasIngredients, useIngredients, addMeal, useMeal, canCook, cook, serveMeal,
      grantProp, hasProp, recordScore, claimSet, claimChest, resetInventory,
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
        s.stats = { ...freshStats(), ...(s.stats || {}), best: { ...(s.stats?.best || {}) } };
        if (!Array.isArray(s.props)) s.props = ["ballon"];
        if (!s.props.includes("ballon")) s.props = [...s.props, "ballon"];
      },
    },
  }
);
