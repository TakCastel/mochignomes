<template>
  <Transition name="sheet">
    <div v-if="gameBus.sheetOpen" class="overlay" @click.self="close">
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="`Fiche de ${store.name}`">
        <div class="grab" />
        <header class="head">
          <div>
            <h2>{{ store.name }}</h2>
            <p class="summary">{{ summary }}</p>
          </div>
          <button class="close" aria-label="Fermer" @click="close">✕</button>
        </header>

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
            <span class="bar-label wide">{{ t.label }}</span>
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

        <p class="tip">Astuce : touche-la pour la chatouiller.</p>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";
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

function close() {
  gameBus.sheetOpen = false;
}
const onKey = (e) => e.key === "Escape" && close();
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  background: rgba(30, 15, 5, 0.35);
}
.sheet {
  width: 100%;
  max-height: 86%;
  overflow-y: auto;
  background: #fff8ee;
  color: #4a2410;
  border-radius: 28px 28px 0 0;
  padding: 10px 20px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -10px 40px rgba(30, 15, 5, 0.3);
}
.grab {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: #e6cfb2;
  margin: 0 auto 14px;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  margin: 0;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
}
.summary { margin: 2px 0 0; font-weight: 700; color: #8a5a3a; }
.close {
  flex: none;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: #f3e2cc;
  color: #4a2410;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}
.sulk {
  margin: 14px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: #efe6ff;
  color: #5b3aa8;
  font-weight: 700;
  font-size: 14px;
}
h3 {
  margin: 20px 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a2775a;
}
.bars {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.bars li {
  display: grid;
  grid-template-columns: 26px 92px 1fr 36px;
  align-items: center;
  gap: 8px;
}
.traits li { grid-template-columns: 118px 1fr 36px; }
.bar-icon { width: 24px; height: 24px; }
.bar-label { font-weight: 800; font-size: 14px; }
.bar {
  height: 12px;
  border-radius: 999px;
  background: #f1dfc7;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s;
}
.bar-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 14px;
}
.bar-value.bonus { color: #d9a400; }
.how {
  margin-top: 16px;
  font-size: 14px;
  color: #7a5236;
}
.how summary { cursor: pointer; font-weight: 800; }
.how ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
.tip { margin: 16px 0 0; font-size: 13px; color: #a2775a; font-weight: 700; }

.sheet-enter-active, .sheet-leave-active { transition: background 0.25s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.3s cubic-bezier(0.3, 1.2, 0.5, 1); }
.sheet-enter-from, .sheet-leave-to { background: rgba(30, 15, 5, 0); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
