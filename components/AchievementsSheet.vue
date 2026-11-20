<template>
  <div class="sheet-content">
    <ul class="list">
      <li v-for="a in rows" :key="a.id" :class="{ done: a.done }">
        <span class="medal">
          <Icon :name="a.icon" class="icon" />
        </span>
        <div class="text">
          <strong>{{ a.label }}</strong>
          <span>{{ a.desc }}</span>
          <div v-if="!a.done" class="progress">
            <div :style="{ width: a.pct + '%' }" />
          </div>
        </div>
        <span class="count">{{ a.done ? "✓" : `${a.value}/${a.goal}` }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ACHIEVEMENTS } from "~/lib/achievements";

const { store } = useCreatureMood();
const rows = computed(() =>
  ACHIEVEMENTS.map((a) => {
    const [value, goal] = a.progress(store);
    const done = store.unlocked.includes(a.id);
    return { ...a, value: Math.min(value, goal), goal, done, pct: Math.min(100, (value / goal) * 100) };
  }).sort((a, b) => Number(b.done) - Number(a.done))
);
</script>

<style scoped>
.list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.list li {
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 3px 0 var(--plate-lo), 0 6px 14px var(--plate-shade);
}
.list li.done {
  background: linear-gradient(180deg, #fff6d6, #ffe9a8);
  box-shadow: 3px 4px 8px rgba(160, 120, 40, 0.3), -2px -2px 6px #fff;
}
.medal {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--knob-lo);
  box-shadow: inset 2px 2px 4px var(--plate-shade);
}
.done .medal { background: radial-gradient(circle at 40% 30%, #fff7c9, #ffc93c); box-shadow: 0 3px 0 #d39a00; }
.icon { width: 28px; height: 28px; color: #b9a58e; }
.done .icon { color: #fff; filter: drop-shadow(0 2px 0 #b07c00); }
.text { display: grid; gap: 2px; min-width: 0; }
.text strong { font-size: 15px; }
.text span { font-size: 13px; color: color-mix(in srgb, var(--ink) 72%, #fff); font-weight: 700; }
.progress { height: 7px; margin-top: 4px; border-radius: 999px; background: var(--knob-lo); overflow: hidden; }
.progress div { height: 100%; background: #ff9f1c; border-radius: 999px; }
.count { font-weight: 800; font-size: 13px; color: color-mix(in srgb, var(--ink) 72%, #fff); font-variant-numeric: tabular-nums; }
.done .count { color: #2f9e44; font-size: 20px; }
</style>
