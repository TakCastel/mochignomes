// État dérivé partagé entre les composants : humeur, bouderie, et un petit
// canal pour piloter l'écran depuis n'importe où (parler, tourner, photo,
// panneau ouvert, notifications).
import { computed, reactive } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { moodFromStats, morphFromStats } from "~/lib/creatureLook";

export const gameBus = reactive({
  speech: null, // { text, id }
  command: null, // { type: "rotate" | "photo" | "react", value, id }
  page: null, // page plein écran : null (Maison) | "elle" | "jours" | "album"
  albumTab: "photos", // "photos" | "succes"
  highlight: null, // { action, id } : fait pulser une tuile d'action
  sheet: null, // fenêtre ouverte : null | "reglages"
  toasts: [], // notifications { id, text, icon }
  phase: "day",
  seenUnlocked: 0, // succès déjà vus dans le carnet
});

export function gameSay(text) {
  gameBus.speech = { text, id: Math.random() };
}

export function gameCommand(type, value) {
  gameBus.command = { type, value, id: Math.random() };
}

let toastId = 0;
export function gameToast(text, icon = "solar:stars-bold-duotone") {
  const id = ++toastId;
  gameBus.toasts.push({ id, text, icon });
  setTimeout(() => {
    const i = gameBus.toasts.findIndex((t) => t.id === id);
    if (i >= 0) gameBus.toasts.splice(i, 1);
  }, 3200);
}

const PAGE_NAMES = { elle: "Elle", jours: "Jours", album: "Album" };

export function openPage(name) {
  if (!PAGE_NAMES[name]) return closePage();
  const store = useTamagotchiStore();
  if (!(store.unlockedPages || []).includes(name)) {
    gameToast(`${PAGE_NAMES[name]} arrive bientôt, continue de t'occuper d'elle.`, "solar:lock-keyhole-bold");
    return;
  }
  gameBus.sheet = null;
  gameBus.page = name;
}
export function closePage() {
  gameBus.page = null;
}
export function openSettings() {
  gameBus.sheet = "reglages";
}
export function closeSettings() {
  gameBus.sheet = null;
}
export function highlightAction(action) {
  gameBus.page = null;
  gameBus.sheet = null;
  gameBus.highlight = { action, id: Math.random() };
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
