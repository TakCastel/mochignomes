<template>
  <div
    class="min-h-screen bg-orange-200 flex flex-col items-center justify-between p-4"
  >
    <NameGenerator />

    <p v-if="store.speed > 1" class="text-sm text-[#5c2e10] opacity-70">
      Temps accéléré : une heure passe en {{ Math.round(3600 / store.speed) }} s
    </p>

    <!-- Tamagoshi -->
    <Tamagotchi />

    <!-- Jauges -->
    <div
      class="w-full max-w-md bg-white/50 p-4 rounded-xl shadow-md space-y-4 mb-4"
    >
      <Gauge label="Faim" color="orange" :value="store.hunger" />
      <div class="h-px bg-[#E5B87D]" />

      <Gauge label="Propreté" color="blue" :value="store.cleanliness" />
      <div class="h-px bg-[#E5B87D]" />

      <Gauge label="Amusement" color="green" :value="store.fun" />
      <div class="h-px bg-[#E5B87D]" />

      <Gauge label="Énergie" color="purple" :value="store.energy" />
      <div class="h-px bg-[#E5B87D]" />

      <Gauge label="Santé" color="red" :value="store.health" />
    </div>

    <!-- Caractère -->
    <div class="w-full max-w-md mb-[110px]">
      <PersonalityCard />
    </div>

    <!-- Actions -->
    <div class="fixed bottom-4 w-full flex justify-center">
      <BottomActions :is-sleeping="store.isSleeping" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";

const store = useTamagotchiStore();

onMounted(() => {
  store.startDecay();
});
</script>
