<template>
  <!-- carnet « Ce qu'elle aime » (page Elle) : ses goûts découverts en jouant -->
  <section class="card tastes" aria-label="Ce qu'elle aime">
    <header class="head">
      <h3><Icon name="solar:notebook-bold-duotone" class="h-ic" />Ce qu'elle aime</h3>
      <span class="count" :class="{ full: seenCount === TASTE_KEYS.length }">{{ seenCount }}/{{ TASTE_KEYS.length }}</span>
    </header>
    <div class="bar"><div class="fill" :style="{ width: Math.round((seenCount / TASTE_KEYS.length) * 100) + '%' }" /></div>

    <ul class="list">
      <li v-for="e in loves" :key="e.key" class="entry" :class="{ known: e.known, fresh: e.known && fresh.has(e.key) }">
        <span class="badge love">
          <template v-if="e.known">
            <span v-if="e.swatch" class="swatch" :style="{ background: e.swatch }" />
            <span v-else-if="e.emoji" class="emoji">{{ e.emoji }}</span>
            <Icon v-else :name="e.icon" class="b-ic" :style="e.ink ? { color: e.ink } : null" />
          </template>
          <Icon v-else name="solar:question-circle-bold-duotone" class="b-ic q" />
        </span>
        <span class="txt">
          <span class="kind">{{ e.kind }}</span>
          <strong v-if="e.known">{{ e.value }}</strong>
          <span v-else class="hint">{{ e.hint }}</span>
        </span>
        <Icon v-if="e.known" name="solar:heart-bold-duotone" class="mood love-ic" />
      </li>
    </ul>

    <h4><Icon name="solar:heart-broken-bold-duotone" class="h4-ic" />Ce qu'elle boude</h4>
    <ul class="list">
      <li v-for="e in dislikes" :key="e.key" class="entry dis" :class="{ known: e.known, fresh: e.known && fresh.has(e.key) }">
        <span class="badge">
          <template v-if="e.known">
            <span v-if="e.swatch" class="swatch" :style="{ background: e.swatch }" />
            <span v-else-if="e.emoji" class="emoji">{{ e.emoji }}</span>
            <Icon v-else :name="e.icon" class="b-ic" :style="e.ink ? { color: e.ink } : null" />
          </template>
          <Icon v-else name="solar:question-circle-bold-duotone" class="b-ic q" />
        </span>
        <span class="txt">
          <span class="kind">{{ e.kind }}</span>
          <strong v-if="e.known">{{ e.value }}</strong>
          <span v-else class="hint">{{ e.hint }}</span>
        </span>
      </li>
    </ul>
    <p v-if="isBaby" class="note">Un bébé aime tout ! Ce qu'elle boude se révélera quand elle grandira.</p>
    <p v-else-if="seenCount === TASTE_KEYS.length" class="note done">Tu la connais par cœur.</p>
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
      return { ...base, kind: key === "food" ? "Plat préféré" : "Plat", value: lower(r?.label), emoji: r?.emoji,
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
.card { padding: 14px; border-radius: 22px; background: #fff; box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1); }
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
h3 { display: flex; align-items: center; gap: 6px; margin: 0; font: 600 17px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.h-ic { width: 22px; height: 22px; color: #ff4f86; }
.count { padding: 3px 10px; border-radius: 999px; background: #ffeef4; color: #c22d63; font: 800 13px "Nunito", system-ui, sans-serif; }
.count.full { background: #eefae6; color: #2a7a1a; }
.bar { height: 8px; border-radius: 999px; background: #f1e3ea; overflow: hidden; margin-bottom: 12px; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ff9ec0, #ff4f86); transition: width 0.5s; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.entry { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 16px; background: #f8fafc; border: 2px dashed #e3e8ee; }
.entry.known { background: #fff6f9; border: 2px solid #ffe0ea; }
.entry.dis.known { background: #f6f2ff; border-color: #e6dcff; }
.entry.fresh { animation: reveal 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes reveal { 0% { transform: scale(0.9); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
.badge { flex: none; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 14px; background: #fff; box-shadow: 0 2px 6px rgba(40, 55, 80, 0.08); }
.b-ic { width: 28px; height: 28px; }
.b-ic.q { color: #c3cad4; }
.swatch { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 0 2px #fff, 0 0 0 3px rgba(40, 55, 80, 0.15); }
.emoji { font-size: 26px; line-height: 1; }
.txt { flex: 1; display: grid; gap: 1px; min-width: 0; }
.kind { font: 800 12px "Nunito", system-ui, sans-serif; color: #8a94a3; }
.txt strong { font: 700 16px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.hint { font-weight: 700; font-size: 13px; color: #6b7686; }
.mood { flex: none; width: 22px; height: 22px; }
.love-ic { color: #ff4f86; }
h4 { display: flex; align-items: center; gap: 6px; margin: 14px 0 8px; font: 600 15px "Fredoka", "Nunito", system-ui, sans-serif; color: #5b3aa8; }
.h4-ic { width: 20px; height: 20px; }
.note { margin: 10px 0 0; font-weight: 700; font-size: 13px; color: #8a94a3; }
.note.done { color: #2a7a1a; }
@media (prefers-reduced-motion: reduce) { .entry.fresh { animation: none; } }
</style>
