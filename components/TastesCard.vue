<template>
  <!-- carnet « Ce qu'elle aime » (page Elle) : ses goûts découverts en jouant -->
  <section class="ui-card tastes" aria-label="Ce qu'elle aime">
    <header class="ui-section-head">
      <h3 class="ui-section-title"><Icon name="solar:notebook-bold-duotone" class="ic love" />Ce qu'elle aime</h3>
      <span class="ui-tag" :class="seenCount === TASTE_KEYS.length ? 'ui-tag--accent' : 'ui-tag--love'">{{ seenCount }}/{{ TASTE_KEYS.length }}</span>
    </header>
    <div class="ui-bar ui-bar--thin bar"><i :style="{ width: Math.round((seenCount / TASTE_KEYS.length) * 100) + '%' }" /></div>

    <ul class="list">
      <li v-for="e in loves" :key="e.key" class="ui-row is-well entry" :class="{ 'is-love': e.known, fresh: e.known && fresh.has(e.key) }">
        <span class="ui-thumb">
          <template v-if="e.known">
            <span v-if="e.swatch" class="swatch" :style="{ background: e.swatch }" />
            <span v-else-if="e.emoji"><FoodImg :id="e.foodId" :emoji="e.emoji" /></span>
            <Icon v-else :name="e.icon" class="ic" :style="e.ink ? { color: e.ink } : null" />
          </template>
          <Icon v-else name="solar:question-circle-bold-duotone" class="ic q" />
        </span>
        <span class="ui-row-main">
          <span class="ui-caption">{{ e.kind }}</span>
          <strong v-if="e.known" class="ui-row-title">{{ e.value }}</strong>
          <span v-else class="hint">{{ e.hint }}</span>
        </span>
        <Icon v-if="e.known" name="solar:heart-bold-duotone" class="mood" />
      </li>
    </ul>

    <h4 class="ui-section-title sub"><Icon name="solar:heart-broken-bold-duotone" class="ic violet" />Ce qu'elle boude</h4>
    <ul class="list">
      <li v-for="e in dislikes" :key="e.key" class="ui-row is-well entry" :class="{ dis: e.known, fresh: e.known && fresh.has(e.key) }">
        <span class="ui-thumb">
          <template v-if="e.known">
            <span v-if="e.swatch" class="swatch" :style="{ background: e.swatch }" />
            <span v-else-if="e.emoji"><FoodImg :id="e.foodId" :emoji="e.emoji" /></span>
            <Icon v-else :name="e.icon" class="ic" :style="e.ink ? { color: e.ink } : null" />
          </template>
          <Icon v-else name="solar:question-circle-bold-duotone" class="ic q" />
        </span>
        <span class="ui-row-main">
          <span class="ui-caption">{{ e.kind }}</span>
          <strong v-if="e.known" class="ui-row-title">{{ e.value }}</strong>
          <span v-else class="hint">{{ e.hint }}</span>
        </span>
      </li>
    </ul>
    <p v-if="isBaby" class="ui-caption foot">Un bébé aime tout ! Ce qu'elle boude se révélera quand elle grandira.</p>
    <p v-else-if="seenCount === TASTE_KEYS.length" class="ui-caption foot done">Tu la connais par cœur.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { TASTE_KEYS, CHANNELS } from "~/lib/tastes";
import { COLORS, recipeById, activityById, itemById } from "~/lib/catalog";
import { itemIcon, swatchBg, inkFor } from "~/lib/itemIcons";

const inv = useInventoryStore();
const store = useTamagotchiStore();

const tastes = computed(() => store.tastes || {});
const seen = computed(() => new Set(inv.tastesSeen || []));
const seenCount = computed(() => TASTE_KEYS.filter((k) => seen.value.has(k)).length);
const isBaby = computed(() => store.stage === "bebe" || store.stage === "oeuf");

// pastille « nouveau » sur les goûts découverts pendant que la page est ouverte
const fresh = ref(new Set());
watch(() => [...(inv.tastesSeen || [])], (now, before) => {
  const b = new Set(before || []);
  const add = now.filter((k) => !b.has(k));
  if (add.length) fresh.value = new Set([...fresh.value, ...add]);
});

const CHANNEL_ICONS = { "dessin-anime": "solar:emoji-funny-circle-bold-duotone", nature: "solar:sun-bold-duotone", cuisine: "solar:chef-hat-bold-duotone" };
const lower = (s) => (s || "").toLowerCase();

function entry(key) {
  const v = tastes.value[key];
  const known = seen.value.has(key);
  const base = { key, known };
  switch (key) {
    case "color": case "colorDislike":
      return { ...base, kind: key === "color" ? "Couleur préférée" : "Couleur", value: lower(COLORS[v]?.label), swatch: swatchBg(v),
        hint: key === "color" ? "Mets-lui des vêtements de couleurs différentes." : "Certaines couleurs la font bouder… observe-la." };
    case "food": case "foodDislike": {
      const r = recipeById(v);
      return { ...base, kind: key === "food" ? "Plat préféré" : "Plat", value: lower(r?.label), emoji: r?.emoji, foodId: r?.id,
        hint: key === "food" ? "Cuisine-lui des plats variés." : "Un plat la fait grimacer : lequel ?" };
    }
    case "activity": {
      const a = activityById(v);
      return { ...base, kind: "Activité préférée", value: lower(a?.label), icon: a?.icon || "solar:football-bold-duotone", ink: "#2a9a3a",
        hint: "Joue avec elle à tout ce que tu peux !" };
    }
    case "channel": {
      const c = CHANNELS.find((x) => x.id === v);
      return { ...base, kind: "Émission préférée", value: lower(c?.label), icon: CHANNEL_ICONS[v] || "solar:tv-bold-duotone", ink: "#3b7ddd",
        hint: "Change de chaîne quand vous regardez la télé." };
    }
    case "itemLove": case "itemDislike":
      return { ...base, kind: key === "itemLove" ? "Accessoire chouchou" : "Accessoire", value: lower(itemById(v)?.label), icon: itemIcon(v),
        ink: inkFor(key === "itemLove" ? tastes.value.color : "gris"),
        hint: key === "itemLove" ? "Essaie-lui des accessoires : l'un d'eux la rend toute fière." : "Un accessoire ne lui plaît pas du tout…" };
    default:
      return { ...base, kind: "", value: "", hint: "" };
  }
}

const loves = computed(() => ["color", "food", "activity", "channel", "itemLove"].map(entry));
const dislikes = computed(() => ["colorDislike", "foodDislike", "itemDislike"].map(entry));
</script>

<style scoped>
.ic.love { color: var(--love); }
.ic.violet { color: var(--violet); }
.bar { margin-bottom: var(--s-3); }
.bar > i { background: linear-gradient(90deg, #ff9ec0, var(--love)); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
.entry { min-height: 60px; padding: var(--s-2) 10px; }
.entry.dis { background: color-mix(in srgb, #f5f1ff var(--tint), var(--surface)); box-shadow: inset 0 0 0 2px #e6dcff; }
.entry.fresh { animation: reveal 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes reveal { 0% { transform: scale(0.9); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
.ui-thumb { width: 42px; height: 42px; font-size: 26px; background: var(--surface); }
.ui-thumb .ic { width: 28px; height: 28px; }
.q { color: var(--ink-4); }
.swatch { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 0 2px var(--surface), 0 1px 4px rgba(40, 55, 80, 0.25); }
.hint { font: 700 13px/1.3 var(--font-text); color: var(--ink-2); }
.mood { flex: none; width: 22px; height: 22px; color: var(--love); }
.sub { margin-top: var(--s-4); font-size: 15px; }
.foot { margin-top: 10px; }
.foot.done { color: var(--accent-ink); }
@media (prefers-reduced-motion: reduce) { .entry.fresh { animation: none; } }
</style>
