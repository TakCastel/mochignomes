<template>
  <div class="w-full max-w-md bg-white/50 p-4 rounded-xl shadow-md">
    <div class="flex items-baseline justify-between gap-3 mb-1">
      <h2 class="font-bold text-lg text-brown-800">Caractère</h2>
      <span v-if="sulking" class="text-sm font-semibold text-[#b5452a]">boude en ce moment</span>
    </div>
    <p class="text-sm text-brown-800/80 mb-3">{{ summary }}</p>

    <ul class="space-y-2">
      <li v-for="t in rows" :key="t.key" class="flex items-center gap-3">
        <span class="w-24 text-sm font-semibold text-brown-800">{{ t.label }}</span>
        <div class="flex-1 bg-[#F5D8A8] rounded-full h-2.5 overflow-hidden">
          <div
            class="h-2.5 rounded-full transition-all duration-500"
            :style="{ width: Math.round(t.value * 100) + '%', backgroundColor: t.color }"
          />
        </div>
      </li>
    </ul>

    <details class="mt-3 text-sm text-brown-800/80">
      <summary class="cursor-pointer font-semibold">Comment il se forme</summary>
      <ul class="mt-2 space-y-1 list-disc pl-5">
        <li v-for="t in rows" :key="t.key"><strong>{{ t.label }}</strong> : {{ t.hint }}</li>
        <li>Les habitudes s'estompent doucement si tu changes ta façon de t'en occuper.</li>
      </ul>
    </details>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";

const store = useTamagotchiStore();

const INFO = {
  joueuse: { label: "Joueuse", color: "#22C55E", hint: "quand tu joues souvent avec elle." },
  caline: { label: "Câline", color: "#EE4D6A", hint: "quand tu la chatouilles (touche-la)." },
  gourmande: { label: "Gourmande", color: "#F59E0B", hint: "quand tu la nourris alors qu'elle n'a plus faim. Elle prend du ventre plus vite." },
  coquette: { label: "Coquette", color: "#3B82F6", hint: "quand tu la laves alors qu'elle est déjà propre. Elle se trouve sale plus tôt." },
  rancuniere: { label: "Rancunière", color: "#8B5CF6", hint: "quand tu la laisses manquer de quelque chose. Elle boude ensuite un moment, et jouer avec elle l'apaise." },
};

const rows = computed(() =>
  Object.entries(INFO).map(([key, info]) => ({ key, ...info, value: store.traits[key] || 0 }))
);

const sulking = computed(() => store.isSulking(store.lastUpdate || Date.now()));

const summary = computed(() => {
  const strong = rows.value.filter((t) => t.value >= 0.35).sort((a, b) => b.value - a.value);
  const name = store.name || "Elle";
  if (!strong.length) return `Le caractère de ${name} est encore en train de se former.`;
  const words = strong.slice(0, 2).map((t) => t.label.toLowerCase());
  return `${name} devient ${words.join(" et ")}.`;
});
</script>

<style scoped>
.text-brown-800 {
  color: #5c2e10;
}
</style>
