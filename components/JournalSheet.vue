<template>
  <BaseSheet :open="gameBus.sheet === 'journal'" title="Journal" :subtitle="ageText" icon="fluent-emoji-flat:spiral-calendar">
    <div class="cards">
      <div class="card big">
        <Icon name="fluent-emoji-flat:star" class="icon" />
        <strong>Niveau {{ lvl.level }}</strong>
        <span>{{ lvl.into }} / {{ lvl.need }} points vers le niveau {{ lvl.level + 1 }}</span>
      </div>
      <div v-for="c in cards" :key="c.label" class="card">
        <Icon :name="c.icon" class="icon" />
        <strong>{{ c.value }}</strong>
        <span>{{ c.label }}</span>
      </div>
    </div>
    <p class="born">Née le {{ born }}.</p>
  </BaseSheet>
</template>

<script setup>
import { computed } from "vue";
import { levelInfo } from "~/stores/useTamagotchiStore";
import { ageInDays } from "~/lib/achievements";

const { store } = useCreatureMood();
const lvl = computed(() => levelInfo(store.xp));
const days = computed(() => (store.lastUpdate, ageInDays(store)));
const ageText = computed(() =>
  days.value < 1 ? `${store.name} est née aujourd'hui` : `${store.name} a ${days.value} jour${days.value > 1 ? "s" : ""}`
);
const born = computed(() =>
  store.bornAt ? new Date(store.bornAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "aujourd'hui"
);
const n = (k) => store.counters[k] || 0;
const cards = computed(() => [
  { label: "repas", value: n("nourrir"), icon: "fluent-emoji-flat:bread" },
  { label: "bains", value: n("laver"), icon: "fluent-emoji-flat:bathtub" },
  { label: "parties", value: n("jouer"), icon: "fluent-emoji-flat:soccer-ball" },
  { label: "danses", value: n("danser"), icon: "fluent-emoji-flat:musical-notes" },
  { label: "câlins", value: n("calin") + n("chatouiller"), icon: "fluent-emoji-flat:two-hearts" },
  { label: "soins", value: n("soigner"), icon: "fluent-emoji-flat:syringe" },
  { label: "photos", value: n("photo"), icon: "fluent-emoji-flat:camera-with-flash" },
]);
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 8px;
}
.card {
  display: grid;
  justify-items: start;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 20px;
  background: #f1e5d5;
  box-shadow: inset 2px 2px 6px rgba(140, 110, 80, 0.3), inset -2px -2px 6px #fff;
}
.card.big {
  grid-column: 1 / -1;
  background: linear-gradient(180deg, #fff6d6, #ffe9a8);
  box-shadow: 3px 4px 8px rgba(160, 120, 40, 0.3), -2px -2px 6px #fff;
}
.icon { width: 30px; height: 30px; }
.card strong { font-family: "Fredoka", "Nunito", system-ui, sans-serif; font-size: 24px; line-height: 1.1; }
.card span { font-size: 13px; font-weight: 700; color: #8a5a3a; }
.born { margin: 16px 0 0; font-weight: 700; color: #a2775a; font-size: 14px; }
</style>
