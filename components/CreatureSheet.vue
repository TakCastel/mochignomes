<template>
  <BaseSheet :open="gameBus.sheet === 'fiche'" :title="store.name" :subtitle="summary" icon="fluent-emoji-flat:sparkles">
    <p v-if="sulking" class="sulk">Elle boude en ce moment. Jouer avec elle l'apaise.</p>

    <h3>Jauges</h3>
    <ul class="bars">
      <li v-for="s in statRows" :key="s.key">
        <Icon :name="s.icon" class="bar-icon" />
        <span class="bar-label">{{ s.label }}</span>
        <div class="bar"><div class="bar-fill" :style="{ width: s.width + '%', background: s.color }" /></div>
        <span class="bar-value" :class="{ bonus: s.value > 100 }">{{ Math.round(s.value) }}</span>
      </li>
    </ul>

    <h3>Caractère</h3>
    <ul class="bars traits">
      <li v-for="t in traitRows" :key="t.key">
        <span class="bar-label">{{ t.label }}</span>
        <div class="bar"><div class="bar-fill" :style="{ width: Math.round(t.value * 100) + '%', background: t.color }" /></div>
        <span class="bar-value">{{ Math.round(t.value * 100) }}</span>
      </li>
    </ul>

    <details class="how">
      <summary>Comment se forme son caractère</summary>
      <ul>
        <li v-for="t in traitRows" :key="t.key"><strong>{{ t.label }}</strong> : {{ t.hint }}</li>
        <li>Les habitudes s'estompent doucement si tu changes ta façon de t'en occuper.</li>
      </ul>
    </details>

    <p class="tip">Astuces : touche-la pour la chatouiller, glisse le doigt pour la faire tourner.</p>
  </BaseSheet>
</template>

<script setup>
import { computed } from "vue";
import { STATS, TRAIT_INFO } from "~/lib/gameUi";

const { store, sulking } = useCreatureMood();

const statRows = computed(() =>
  STATS.map((s) => ({ ...s, value: store[s.key], width: Math.min(store[s.key], 100) }))
);
const traitRows = computed(() =>
  Object.entries(TRAIT_INFO).map(([key, info]) => ({ key, ...info, value: store.traits[key] || 0 }))
);
const summary = computed(() => {
  const strong = traitRows.value.filter((t) => t.value >= 0.35).sort((a, b) => b.value - a.value);
  if (!strong.length) return "Son caractère est encore en train de se former.";
  return `Elle devient ${strong.slice(0, 2).map((t) => t.label.toLowerCase()).join(" et ")}.`;
});
</script>

<style scoped>
.sulk {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #efe6ff;
  color: #5b3aa8;
  font-weight: 700;
  font-size: 14px;
}
h3 {
  margin: 18px 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a2775a;
}
.bars {
  list-style: none;
  margin: 0;
  padding: 12px;
  display: grid;
  gap: 10px;
  border-radius: 20px;
  background: #f1e5d5;
  box-shadow: inset 2px 2px 6px rgba(140, 110, 80, 0.3), inset -2px -2px 6px #fff;
}
.bars li {
  display: grid;
  grid-template-columns: 26px 88px 1fr 34px;
  align-items: center;
  gap: 8px;
}
.traits li { grid-template-columns: 96px 1fr 34px; }
.bar-icon { width: 24px; height: 24px; }
.bar-label { font-weight: 800; font-size: 14px; }
.bar {
  height: 12px;
  border-radius: 999px;
  background: #e3d3bf;
  overflow: hidden;
  box-shadow: inset 1px 1px 3px rgba(120, 90, 60, 0.35);
}
.bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }
.bar-value { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; font-size: 14px; }
.bar-value.bonus { color: #d9a400; }
.how { margin-top: 16px; font-size: 14px; color: #7a5236; }
.how summary { cursor: pointer; font-weight: 800; }
.how ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
.tip { margin: 16px 0 0; font-size: 13px; color: #a2775a; font-weight: 700; }
</style>
