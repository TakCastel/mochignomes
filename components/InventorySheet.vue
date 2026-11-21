<template>
  <div class="sac">
    <div class="top">
      <CurrencyBar />
    </div>

    <nav class="tabs" role="tablist" aria-label="Rayons du Sac">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        class="tab"
        :class="{ on: tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" class="tab-ic" />
        <span>{{ t.label }}</span>
        <span v-if="t.badge" class="badge">{{ t.badge }}</span>
      </button>
    </nav>

    <!-- ============ TENUES : la garde-robe ============ -->
    <section v-if="tab === 'tenues'" class="pane">
      <WardrobeSheet :focus="focusItem" />
    </section>

    <!-- ============ FRIGO ============ -->
    <section v-else-if="tab === 'frigo'" class="pane">
      <div class="card">
        <h3><Icon name="solar:chef-hat-bold-duotone" class="h-ic" />Plats prêts</h3>
        <div v-if="mealRows.length" class="meals">
          <div v-for="m in mealRows" :key="m.recipe.id" class="meal" :class="{ fav: m.fav }">
            <span class="meal-emoji">{{ m.recipe.emoji }}<small v-if="m.qty > 1">×{{ m.qty }}</small></span>
            <span class="meal-txt">
              <strong>{{ m.recipe.label }}</strong>
              <span class="stars" :aria-label="`${m.stars} étoile${m.stars > 1 ? 's' : ''}`">
                <Icon v-for="s in 3" :key="s" name="solar:star-bold-duotone" class="star" :class="{ on: s <= m.stars }" />
              </span>
              <span v-if="m.fav" class="fav-tag"><Icon name="solar:heart-bold-duotone" class="fav-ic" />Son plat préféré</span>
            </span>
            <button class="go" :class="{ off: !m.can.ok }" @click="serve(m)">
              <Icon name="solar:donut-bitten-bold-duotone" class="go-ic" />Servir
            </button>
          </div>
        </div>
        <p v-else class="empty">Aucun plat au frigo. Cuisine-lui quelque chose de bon !</p>
        <p v-if="serveMsg" class="bubble">{{ serveMsg }}</p>
        <button v-if="store.hasFeature?.('cuisine')" class="link" @click="emit('navigate', { to: 'cuisine' })">
          <Icon name="solar:chef-hat-bold-duotone" class="link-ic" />Cuisiner
        </button>
      </div>

      <div class="card">
        <h3><Icon name="solar:fridge-bold-duotone" class="h-ic" />Ingrédients</h3>
        <div v-if="pantryRows.length" class="pantry">
          <div v-for="p in pantryRows" :key="p.ing.id" class="ing">
            <span class="ing-emoji">{{ p.ing.emoji }}</span>
            <span class="ing-name">{{ p.ing.label }}</span>
            <span class="ing-qty">×{{ p.qty }}</span>
          </div>
        </div>
        <p v-else class="empty">Le frigo est vide.</p>
        <button v-if="store.hasFeature?.('boutique')" class="link" @click="emit('navigate', { to: 'boutique', tab: 'epicerie' })">
          <Icon name="solar:cart-large-2-bold-duotone" class="link-ic" />Faire les courses
        </button>
      </div>
    </section>

    <!-- ============ COLLECTION ============ -->
    <section v-else-if="tab === 'collection'" class="pane">
      <!-- résumé -->
      <div class="card summary">
        <div class="ring" :style="{ '--p': ratio }">
          <span class="ring-val">{{ Math.round(ratio * 100) }}<small>%</small></span>
        </div>
        <div class="sum-txt">
          <strong>{{ inv.collected }} / {{ inv.totalVariants }} variantes</strong>
          <span>{{ inv.itemsOwnedCount }} vêtements sur {{ V1_ITEMS.length }}</span>
          <span>{{ knownCount }} recettes sur {{ V1_RECIPES.length }}</span>
        </div>
      </div>

      <!-- collections thématiques -->
      <div class="card">
        <h3><Icon name="solar:album-bold-duotone" class="h-ic" />Collections</h3>
        <div class="sets">
          <div v-for="s in setRows" :key="s.set.id" class="set" :class="{ ready: s.ready, claimed: s.claimed }">
            <span class="set-ic-wrap"><Icon :name="s.set.icon" class="set-ic" /></span>
            <div class="set-body">
              <div class="set-head">
                <strong>{{ s.set.label }}</strong>
                <span class="set-count">{{ s.p.have }}/{{ s.p.total }}</span>
              </div>
              <div class="bar"><div class="fill" :style="{ width: Math.round(s.p.ratio * 100) + '%' }" /></div>
              <div class="set-items">
                <button
                  v-for="it in s.items"
                  :key="it.id"
                  class="mini"
                  :class="{ have: it.owned }"
                  :aria-label="it.label + (it.owned ? '' : ' (pas encore)')"
                  @click="it.owned ? null : emit('navigate', { to: 'boutique', tab: 'vetements', focus: it.id })"
                >
                  <Icon :name="itemIcon(it.id)" class="mini-ic" :style="{ color: it.owned ? inkFor(it.color) : null }" />
                </button>
              </div>
            </div>
            <button v-if="s.ready" class="claim" @click="claim(s.set.id)">
              <Icon name="solar:gift-bold-duotone" class="claim-ic" />Récupérer
            </button>
            <span v-else-if="s.claimed" class="done"><Icon name="solar:check-circle-bold" class="done-ic" /></span>
            <span v-else class="reward">
              +{{ s.set.reward.coins }}<Icon name="solar:dollar-minimalistic-bold-duotone" class="rw-ic coin" />
              <template v-if="s.set.reward.gems">+{{ s.set.reward.gems }}<Icon name="solar:star-bold-duotone" class="rw-ic gem" /></template>
            </span>
          </div>
        </div>
      </div>

      <!-- tous les vêtements -->
      <div v-for="g in slotGroups" :key="g.slot" class="card">
        <h3><Icon :name="SLOT_ICONS[g.slot]" class="h-ic" />{{ SLOT_LABELS[g.slot] }}</h3>
        <div class="coll-grid">
          <button
            v-for="c in g.items"
            :key="c.item.id"
            class="coll"
            :class="{ have: c.have > 0, full: c.have === c.total }"
            :aria-label="c.have ? `${c.item.label} : ${c.have} couleurs sur ${c.total}` : 'Vêtement pas encore trouvé'"
            @click="openItem(c)"
          >
            <span v-if="c.isNew" class="new" aria-hidden="true" />
            <span v-if="c.item.premium" class="star-badge"><Icon name="solar:star-bold-duotone" class="sb-ic" /></span>
            <span class="coll-art">
              <Icon :name="itemIcon(c.item.id)" class="coll-ic" :style="{ color: c.have ? inkFor(c.color) : null }" />
            </span>
            <span class="coll-name">{{ c.have ? c.item.label : "???" }}</span>
            <span class="coll-count">{{ c.have }}/{{ c.total }}</span>
          </button>
        </div>
      </div>

      <!-- recettes découvertes -->
      <div class="card">
        <h3><Icon name="solar:chef-hat-bold-duotone" class="h-ic" />Recettes découvertes</h3>
        <div class="coll-grid">
          <div v-for="r in recipeRows" :key="r.recipe.id" class="coll recipe" :class="{ have: r.known }">
            <span class="coll-art"><span class="r-emoji">{{ r.recipe.emoji }}</span></span>
            <span class="coll-name">{{ r.known ? r.recipe.label : "???" }}</span>
            <span class="stars small">
              <Icon v-for="s in 3" :key="s" name="solar:star-bold-duotone" class="star" :class="{ on: s <= r.stars }" />
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { gameToast } from "~/composables/useCreatureMood";
import {
  SLOTS, SLOT_LABELS, SLOT_ICONS, SETS, V1_ITEMS, V1_RECIPES,
  itemById, itemColors, recipeById, ingredientById, setProgress,
} from "~/lib/catalog";
import { itemIcon, inkFor } from "~/lib/itemIcons";

const props = defineProps({
  // onglet initial : "tenues" | "frigo" | "collection"
  tab: { type: String, default: "tenues" },
  // vêtement à mettre en avant (passé à la garde-robe, ou ouvert en collection)
  focus: { type: String, default: "" },
});
// navigate : { to: "boutique" | "cuisine", tab?, focus? } (l'intégrateur ouvre l'écran demandé)
const emit = defineEmits(["navigate"]);

const inv = useInventoryStore();
const store = useTamagotchiStore();
const has = (k) => !!store.hasFeature?.(k);

// ---------- onglets ----------
const tabs = computed(() => [
  { key: "tenues", label: "Tenues", icon: "solar:hanger-bold-duotone", badge: inv.unseenCount || 0 },
  { key: "frigo", label: "Frigo", icon: "solar:fridge-bold-duotone", badge: inv.mealsCount || 0 },
  has("collection") ? { key: "collection", label: "Collection", icon: "solar:album-bold-duotone", badge: inv.setsReady.length || 0 } : null,
].filter(Boolean));
const validTab = (t) => (tabs.value.some((x) => x.key === t) ? t : "tenues");
const tab = ref(validTab(props.tab));
const focusItem = ref(props.focus && itemById(props.focus) ? props.focus : "");
watch(() => props.tab, (t) => { tab.value = validTab(t); });
watch(() => props.focus, (f) => {
  if (f && itemById(f)) { focusItem.value = f; tab.value = "tenues"; }
});

// ---------- frigo ----------
const tastes = computed(() => store.tastes || {});
const mealRows = computed(() => Object.entries(inv.meals)
  .filter(([, q]) => q > 0)
  .map(([id, qty]) => ({
    recipe: recipeById(id), qty,
    stars: inv.recipeStars[id] || 1,
    fav: id === tastes.value.food && inv.isTasteSeen("food"),
    can: store.canEatMeal?.(id) || { ok: true },
  }))
  .filter((m) => m.recipe));
const pantryRows = computed(() => Object.entries(inv.pantry)
  .filter(([, q]) => q > 0)
  .map(([id, qty]) => ({ ing: ingredientById(id), qty }))
  .filter((p) => p.ing));
const serveMsg = ref("");
let msgTimer = 0;
function serve(m) {
  const r = inv.serveMeal(m.recipe.id);
  clearTimeout(msgTimer);
  if (!r?.ok) {
    serveMsg.value = r?.reason || "Elle n'a pas faim pour le moment.";
  } else {
    serveMsg.value = r.reaction?.line ? `« ${r.reaction.line} »` : `Miam ! ${m.recipe.label}, quel régal.`;
    try { navigator.vibrate?.([12, 30, 12]); } catch { /* non supporté */ }
  }
  msgTimer = setTimeout(() => (serveMsg.value = ""), 3500);
}

// ---------- collection ----------
const ratio = computed(() => (inv.totalVariants ? inv.collected / inv.totalVariants : 0));
const knownCount = computed(() => V1_RECIPES.filter((r) => inv.recipesKnown.includes(r.id)).length);
const setRows = computed(() => SETS.map((set) => {
  const p = setProgress(set.id, inv.owned);
  return {
    set, p,
    claimed: inv.setsClaimed.includes(set.id),
    ready: inv.setsReady.includes(set.id),
    items: set.items.map((id) => {
      const colors = inv.owned[id] || [];
      return { id, label: itemById(id)?.label || id, owned: colors.length > 0, color: colors[0] };
    }),
  };
}));
const slotGroups = computed(() => SLOTS.map((slot) => ({
  slot,
  items: V1_ITEMS.filter((i) => i.slot === slot).map((item) => {
    const colors = itemColors(item);
    const mine = colors.filter((k) => inv.ownsColor(item.id, k));
    return { item, have: mine.length, total: colors.length, color: mine[0], isNew: inv.isNew(item.id) };
  }),
})).filter((g) => g.items.length));
const recipeRows = computed(() => V1_RECIPES.map((recipe) => ({
  recipe,
  known: inv.recipesKnown.includes(recipe.id),
  stars: inv.recipeStars[recipe.id] || 0,
})));

function openItem(c) {
  // possédé : on le montre dans la garde-robe ; sinon direction la boutique
  if (c.have) { focusItem.value = c.item.id; tab.value = "tenues"; }
  else emit("navigate", { to: "boutique", tab: "vetements", focus: c.item.id });
}
function claim(setId) {
  const r = inv.claimSet(setId);
  if (!r.ok) { gameToast(r.reason, "solar:album-bold-duotone"); return; }
  try { navigator.vibrate?.([20, 40, 20]); } catch { /* non supporté */ }
}
</script>

<style scoped>
.sac { display: grid; gap: 12px; padding-bottom: 8px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tabs { display: flex; gap: 4px; padding: 4px; border-radius: 18px; background: #eef1f5; }
.tab {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #6b7686;
  font: 800 14px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.tab.on { background: #fff; color: var(--ink, #2f3a4a); box-shadow: 0 2px 8px rgba(40, 55, 80, 0.12); }
.tab-ic { width: 20px; height: 20px; }
.tab.on .tab-ic { color: var(--accent, #4fbf34); }
.badge { position: absolute; top: 2px; right: 6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #ff4f86; color: #fff; font: 800 11px/18px "Nunito", system-ui, sans-serif; }
.pane { display: grid; gap: 12px; }
.card { padding: 14px; border-radius: 22px; background: #fff; box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1); }
h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font: 600 17px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.h-ic { width: 22px; height: 22px; color: var(--accent, #4fbf34); }
.empty { margin: 0; color: #8a94a3; font-weight: 700; font-size: 14px; }
.link { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-top: 10px; padding: 0 16px; border: 0; border-radius: 999px; background: #eefae6; color: #2a7a1a; font: 800 14px "Nunito", system-ui, sans-serif; cursor: pointer; }
.link-ic { width: 22px; height: 22px; }

/* frigo */
.meals { display: grid; gap: 8px; }
.meal { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 16px; background: #f8fafc; }
.meal.fav { background: #fff3f7; }
.meal-emoji { position: relative; flex: none; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: #fff; font-size: 32px; box-shadow: 0 2px 6px rgba(40, 55, 80, 0.08); }
.meal-emoji small { position: absolute; right: -4px; bottom: -4px; padding: 0 5px; border-radius: 999px; background: var(--accent, #4fbf34); color: #fff; font: 800 11px/18px "Nunito", system-ui, sans-serif; }
.meal-txt { flex: 1; display: grid; gap: 2px; min-width: 0; }
.meal-txt strong { font: 700 16px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.stars { display: inline-flex; gap: 1px; }
.star { width: 16px; height: 16px; color: #dde2e9; }
.star.on { color: #f5b301; }
.stars.small .star { width: 13px; height: 13px; }
.fav-tag { display: inline-flex; align-items: center; gap: 3px; font: 800 12px "Nunito", system-ui, sans-serif; color: #c22d63; }
.fav-ic { width: 14px; height: 14px; }
.go { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 14px; background: linear-gradient(180deg, var(--accent-hi, #7ad85a), var(--accent, #4fbf34)); color: #fff; font: 700 15px "Fredoka", "Nunito", system-ui, sans-serif; box-shadow: 0 3px 0 var(--accent-lo, #36912a); cursor: pointer; }
.go.off { background: #e3e7ed; color: #7a8494; box-shadow: none; }
.go-ic { width: 20px; height: 20px; }
.bubble { margin: 10px 0 0; padding: 10px 14px; border-radius: 18px 18px 18px 6px; background: #f3fdec; color: #2a7a1a; font-weight: 800; text-align: center; }
.pantry { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.ing { display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 16px; background: #f8fafc; }
.ing-emoji { font-size: 30px; }
.ing-name { font: 700 12px "Nunito", system-ui, sans-serif; color: #5b6676; }
.ing-qty { font: 700 15px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }

/* collection : résumé */
.summary { display: flex; align-items: center; gap: 16px; }
.ring {
  flex: none;
  position: relative;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: conic-gradient(var(--accent, #4fbf34) calc(var(--p) * 360deg), #e8edf2 0);
}
.ring::before { content: ""; position: absolute; inset: 9px; border-radius: 50%; background: #fff; }
.ring-val { position: relative; font: 700 24px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.ring-val small { font-size: 14px; }
.sum-txt { display: grid; gap: 2px; font-weight: 700; color: #6b7686; font-size: 14px; }
.sum-txt strong { font: 700 18px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }

/* sets */
.sets { display: grid; gap: 10px; }
.set { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 18px; background: #f8fafc; }
.set.ready { background: linear-gradient(135deg, #fffaf0, #fff0d1); box-shadow: 0 0 0 2px #ffd27a; animation: glow 1.6s ease-in-out infinite; }
.set.claimed { background: #f3fdec; }
@keyframes glow { 50% { box-shadow: 0 0 0 4px rgba(255, 200, 80, 0.45); } }
.set-ic-wrap { flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; background: #fff; box-shadow: 0 2px 6px rgba(40, 55, 80, 0.08); }
.set-ic { width: 28px; height: 28px; color: var(--accent, #4fbf34); }
.set-body { flex: 1; display: grid; gap: 4px; min-width: 0; }
.set-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.set-head strong { font: 700 15px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.set-count { font: 800 12px "Nunito", system-ui, sans-serif; color: #8a94a3; }
.bar { height: 8px; border-radius: 999px; background: #e3e8ee; overflow: hidden; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--accent-hi, #7ad85a), var(--accent, #4fbf34)); transition: width 0.4s; }
.set-items { display: flex; flex-wrap: wrap; gap: 4px; }
.mini { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 10px; background: #fff; cursor: pointer; }
.mini-ic { width: 20px; height: 20px; color: #2f3a4a; opacity: 0.14; }
.mini.have .mini-ic { opacity: 1; }
.claim { flex: none; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 14px; background: linear-gradient(180deg, #ffc94a, #f5a524); color: #fff; font: 700 14px "Fredoka", "Nunito", system-ui, sans-serif; box-shadow: 0 3px 0 #d4881a; cursor: pointer; }
.claim-ic { width: 20px; height: 20px; }
.done-ic { width: 26px; height: 26px; color: #3c9a22; }
.reward { flex: none; display: inline-flex; align-items: center; gap: 1px; font: 800 12px "Nunito", system-ui, sans-serif; color: #8a94a3; }
.rw-ic { width: 15px; height: 15px; margin-right: 3px; }
.rw-ic.coin { color: #f2b01e; }
.rw-ic.gem { color: #a77bff; }

/* grille de collection */
.coll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; }
.coll {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 10px 4px 8px;
  border: 2px dashed #dfe4ea;
  border-radius: 18px;
  background: #fafbfc;
  cursor: pointer;
  font: inherit;
}
.coll.have { border: 2px solid #e4f5da; background: #fff; }
.coll.full { border-color: #8fdc6a; background: linear-gradient(180deg, #fff, #f3fdec); }
.coll-art { display: grid; place-items: center; width: 50px; height: 50px; }
/* silhouette des vêtements pas encore trouvés */
.coll-ic { width: 40px; height: 40px; color: #2f3a4a; opacity: 0.12; }
.coll.have .coll-ic { opacity: 1; filter: drop-shadow(0 2px 2px rgba(40, 55, 80, 0.2)); }
.coll-name { font: 700 11px/1.15 "Nunito", system-ui, sans-serif; color: #5b6676; text-align: center; min-height: 2.3em; display: grid; place-items: center; }
.coll:not(.have) .coll-name { color: #b3bbc6; }
.coll-count { font: 800 11px "Nunito", system-ui, sans-serif; color: #8a94a3; }
.coll.full .coll-count { color: #3c9a22; }
.new { position: absolute; top: 6px; right: 6px; width: 9px; height: 9px; border-radius: 50%; background: #ff4f86; box-shadow: 0 0 0 2px #fff; }
.star-badge { position: absolute; top: 4px; left: 4px; }
.sb-ic { width: 16px; height: 16px; color: #a77bff; }
.recipe { cursor: default; }
.r-emoji { font-size: 34px; filter: grayscale(1) brightness(0.2); opacity: 0.15; }
.recipe.have .r-emoji { filter: none; opacity: 1; }
@media (prefers-reduced-motion: reduce) { .set.ready { animation: none; } }
</style>
