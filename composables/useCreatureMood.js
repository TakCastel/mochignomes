// État dérivé partagé entre les composants : humeur, bouderie, et un petit
// canal pour piloter l'écran depuis n'importe où (parler, tourner, photo,
// panneau ouvert, notifications).
import { computed, reactive } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { moodFromStats, morphFromStats } from "~/lib/creatureLook";

export const gameBus = reactive({
  speech: null, // { text, id }
  command: null, // { type: "rotate" | "photo" | "react", value, id }
  sheet: null, // panneau ouvert : "fiche" | "galerie" | "succes" | "journal" | "reglages"
  toasts: [], // notifications { id, text, icon }
  phase: "day",
});

export function gameSay(text) {
  gameBus.speech = { text, id: Math.random() };
}

export function gameCommand(type, value) {
  gameBus.command = { type, value, id: Math.random() };
}

let toastId = 0;
export function gameToast(text, icon = "ph:sparkle-fill") {
  const id = ++toastId;
  gameBus.toasts.push({ id, text, icon });
  setTimeout(() => {
    const i = gameBus.toasts.findIndex((t) => t.id === id);
    if (i >= 0) gameBus.toasts.splice(i, 1);
  }, 3200);
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
