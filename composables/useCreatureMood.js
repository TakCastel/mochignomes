// État dérivé partagé entre les composants : humeur, bouderie, et un petit
// canal pour faire parler la créature depuis n'importe où (ex. un bouton refusé).
import { computed, reactive } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { moodFromStats, morphFromStats } from "~/lib/creatureLook";

export const gameBus = reactive({ speech: null, sheetOpen: false });

export function gameSay(text) {
  gameBus.speech = { text, id: Math.random() };
}

export function useCreatureMood() {
  const store = useTamagotchiStore();
  const stats = computed(() => ({
    hunger: store.hunger, cleanliness: store.cleanliness, fun: store.fun,
    energy: store.energy, health: store.health, isSleeping: store.isSleeping,
  }));
  // lastUpdate avance chaque seconde : il sert d'horloge pour la bouderie
  const sulking = computed(() => store.isSulking(store.lastUpdate || Date.now()));
  const mood = computed(() => moodFromStats(stats.value, store.traits, sulking.value));
  const morph = computed(() => morphFromStats(stats.value, store.traits));
  return { store, stats, sulking, mood, morph };
}
