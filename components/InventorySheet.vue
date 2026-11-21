<template>
  <div class="ui-page sac" :class="{ compact: isCompact }">
    <!-- barre étroite (Tenues) : rien que la garde-robe ; la Collection rouvre le volet en grand -->
    <CurrencyBar v-if="!isCompact" />

    <nav v-if="tabs.length > 1 && !isCompact" class="ui-tabs" role="tablist" aria-label="Rayons du Sac">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        class="ui-tab"
        :class="{ 'is-on': tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" class="ic" />
        <span>{{ t.label }}</span>
        <span v-if="t.badge" class="ui-badge">{{ t.badge }}</span>
      </button>
    </nav>

    <!-- ============ TENUES : la garde-robe ============ -->
    <section v-if="tab === 'tenues'" class="ui-stack">
      <WardrobeSheet
        :focus="focusItem"
        :compact="isCompact"
        :collection="has('collection')"
        @collection="tab = 'collection'"
        @shop="(id) => emit('navigate', { to: 'boutique', tab: 'vetements', focus: id || '' })" />
    </section>

    <!-- ============ COLLECTION ============ -->
    <section v-else-if="tab === 'collection'" class="ui-stack">
      <!-- résumé -->
      <div class="ui-card summary">
        <div class="progress-ring" :style="{ '--p': ratio }">
          <span class="ring-val ui-num">{{ Math.round(ratio * 100) }}<small>%</small></span>
        </div>
        <div class="sum-txt">
          <strong>{{ inv.collected }} / {{ inv.totalVariants }} variantes</strong>
          <span class="ui-caption">{{ inv.itemsOwnedCount }} vêtements sur {{ V1_ITEMS.length }}</span>
          <span class="ui-caption">{{ knownCount }} recettes sur {{ V1_RECIPES.length }}</span>
        </div>
      </div>

      <!-- collections thématiques -->
      <div class="ui-card">
        <h3 class="ui-section-title"><Icon name="solar:album-bold-duotone" class="ic" />Collections</h3>
        <div class="ui-stack ui-stack--sm">
          <div v-for="s in setRows" :key="s.set.id" class="ui-row is-well set" :class="{ ready: s.ready, 'is-on': s.claimed }">
            <span class="ui-thumb ui-thumb--accent"><Icon :name="s.set.icon" class="ic" /></span>
            <div class="ui-row-main">
              <div class="set-head">
                <strong class="ui-row-title">{{ s.set.label }}</strong>
                <span class="ui-caption">{{ s.p.have }}/{{ s.p.total }}</span>
              </div>
              <div class="ui-bar ui-bar--thin"><i :style="{ width: Math.round(s.p.ratio * 100) + '%' }" /></div>
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
            <button v-if="s.ready" class="ui-btn ui-btn--gold ui-btn--sm" @click="claim(s.set.id)">
              <Icon name="solar:gift-bold-duotone" class="ic" />Récupérer
            </button>
            <Icon v-else-if="s.claimed" name="solar:check-circle-bold" class="done-ic" />
            <span v-else class="reward">
              <span class="ui-price small"><Icon name="mochi:coin" class="ic" />+{{ s.set.reward.coins }}</span>
              <span v-if="s.set.reward.gems" class="ui-price small ui-price--gems"><Icon name="solar:star-bold-duotone" class="ic" />+{{ s.set.reward.gems }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- tous les vêtements -->
      <div v-for="g in slotGroups" :key="g.slot" class="ui-card">
        <h3 class="ui-section-title"><Icon :name="SLOT_ICONS[g.slot]" class="ic" />{{ SLOT_LABELS[g.slot] }}</h3>
        <div class="coll-grid">
          <button
            v-for="c in g.items"
            :key="c.item.id"
            class="ui-tile coll"
            :class="{ 'is-ghost': !c.have, 'is-on': c.have && c.have === c.total }"
            :aria-label="c.have ? `${c.item.label} : ${c.have} couleurs sur ${c.total}` : 'Vêtement pas encore trouvé'"
            @click="openItem(c)"
          >
            <span v-if="c.isNew" class="ui-dot" aria-hidden="true" />
            <Icon v-if="c.item.premium" name="solar:star-bold-duotone" class="star-badge" />
            <span class="coll-art">
              <Icon :name="itemIcon(c.item.id)" class="coll-ic" :style="{ color: c.have ? inkFor(c.color) : null }" />
            </span>
            <span class="ui-tile-label coll-name">{{ c.have ? c.item.label : "???" }}</span>
            <span class="ui-tile-sub">{{ c.have }}/{{ c.total }}</span>
          </button>
        </div>
      </div>

      <!-- recettes découvertes -->
      <div class="ui-card">
        <h3 class="ui-section-title"><Icon name="solar:chef-hat-bold-duotone" class="ic" />Recettes découvertes</h3>
        <div class="coll-grid">
          <div v-for="r in recipeRows" :key="r.recipe.id" class="ui-tile coll recipe" :class="{ 'is-ghost': !r.known }">
            <span class="coll-art"><span class="r-emoji"><FoodImg :id="r.recipe.id" :emoji="r.recipe.emoji" /></span></span>
            <span class="ui-tile-label coll-name">{{ r.known ? r.recipe.label : "???" }}</span>
            <span class="ui-stars small">
              <Icon v-for="s in 3" :key="s" name="solar:star-bold" class="ic" :class="{ on: s <= r.stars }" />
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
import { gameBus, gameToast } from "~/composables/useCreatureMood";
import {
  SLOTS, SLOT_LABELS, SLOT_ICONS, SETS, V1_ITEMS, V1_RECIPES,
  itemById, itemColors, setProgress,
} from "~/lib/catalog";
import { itemIcon, inkFor } from "~/lib/itemIcons";

const props = defineProps({
  // onglet initial : "tenues" | "collection" (le frigo est dans la Cuisine)
  tab: { type: String, default: "tenues" },
  // volet latéral étroit : la garde-robe en barre verticale (sous-menus emplacement > vêtement > couleur)
  compact: { type: Boolean, default: false },
  // vêtement à mettre en avant (passé à la garde-robe, ou ouvert en collection)
  focus: { type: String, default: "" },
});
// navigate : { to: "boutique", tab?, focus? } (l'intégrateur ouvre l'écran demandé)
const emit = defineEmits(["navigate"]);

const inv = useInventoryStore();
const store = useTamagotchiStore();
const has = (k) => !!store.hasFeature?.(k);

// ---------- onglets ----------
const tabs = computed(() => [
  { key: "tenues", label: "Tenues", icon: "solar:hanger-bold-duotone", badge: inv.unseenCount || 0 },
  has("collection") ? { key: "collection", label: "Collection", icon: "solar:album-bold-duotone", badge: inv.setsReady.length || 0 } : null,
].filter(Boolean));
const validTab = (t) => (tabs.value.some((x) => x.key === t) ? t : "tenues");
const tab = ref(validTab(props.tab));
const focusItem = ref(props.focus && itemById(props.focus) ? props.focus : "");
watch(() => props.tab, (t) => { tab.value = validTab(t); });
// l'onglet ouvert remonte au bus : Tenues = barre étroite, Collection = volet large (GameSheet)
watch(tab, (t) => { gameBus.pageTab = t; }, { immediate: true });
const isCompact = computed(() => props.compact && tab.value === "tenues");
watch(() => props.focus, (f) => {
  if (f && itemById(f)) { focusItem.value = f; tab.value = "tenues"; }
});

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
.mt { margin-top: var(--s-3); }

/* collection : résumé */
.summary { display: flex; align-items: center; gap: var(--s-4); }
.progress-ring {
  flex: none;
  position: relative;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) calc(var(--p) * 360deg), var(--surface-3) 0);
}
.progress-ring::before { content: ""; position: absolute; inset: 9px; border-radius: 50%; background: var(--surface); }
.ring-val { position: relative; font-size: 24px; font-weight: 700; color: var(--ink); }
.ring-val small { font-size: var(--t-md); }
.sum-txt { display: grid; gap: 2px; min-width: 0; }
.sum-txt strong { font: 700 var(--t-xl) var(--font-title); color: var(--ink); }

/* collections */
.set { align-items: flex-start; }
.set.ready { background: linear-gradient(135deg, color-mix(in srgb, #fffaf0 var(--tint), var(--surface)), color-mix(in srgb, #fff0d1 var(--tint), var(--surface))); box-shadow: inset 0 0 0 2px #ffd27a; animation: glow 1.6s ease-in-out infinite; }
@keyframes glow { 50% { box-shadow: inset 0 0 0 2px #ffd27a, 0 0 0 4px rgba(255, 200, 80, 0.4); } }
.set .ui-row-main { gap: 6px; }
.set-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.set-items { display: flex; flex-wrap: wrap; gap: 4px; }
.mini { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: var(--r-xs); background: var(--surface); cursor: pointer; }
.mini-ic { width: 20px; height: 20px; color: var(--ink); opacity: 0.14; }
.mini.have .mini-ic { opacity: 1; }
.set > .ui-btn, .set > .done-ic, .set > .reward { align-self: center; }
.done-ic { flex: none; width: 28px; height: 28px; color: var(--accent-lo); }
.reward { flex: none; display: grid; justify-items: end; gap: 2px; }
.ui-price.small { font-size: var(--t-md); color: var(--ink-2); }
.ui-price.small .ic { width: 16px; height: 16px; }

/* grille de collection */
.coll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: var(--s-2); }
.coll { padding: 10px 4px 8px; gap: 2px; }
.coll-art { display: grid; place-items: center; width: 48px; height: 48px; }
/* silhouette des vêtements pas encore trouvés */
.coll-ic { width: 38px; height: 38px; color: var(--ink); opacity: 0.12; }
.coll:not(.is-ghost) .coll-ic { opacity: 1; filter: drop-shadow(0 2px 2px rgba(40, 55, 80, 0.2)); }
.coll-name { min-height: 2.3em; display: grid; place-items: center; }
.coll.is-ghost .coll-name { color: var(--ink-4); }
.star-badge { position: absolute; top: 6px; left: 6px; width: 16px; height: 16px; color: var(--gem); }
.recipe { cursor: default; }
.r-emoji { font-size: 32px; filter: grayscale(1) brightness(0.2); opacity: 0.15; }
.recipe:not(.is-ghost) .r-emoji { filter: none; opacity: 1; }
.ui-stars.small .ic { width: 13px; height: 13px; }
@media (prefers-reduced-motion: reduce) { .set.ready { animation: none; } }
</style>
