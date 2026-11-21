// Album photo de la créature du pré, gardé dans ce navigateur (localStorage).
// Une liste par créature de la maison : clé « tamagotchi-photos:<id> » (store.activeId).
// L'ancienne clé unique « tamagotchi-photos » est rendue à la première créature (schéma 7).
import { effectScope, ref, watch } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";

const KEY = "tamagotchi-photos";
const MAX = 12;
const photos = ref([]);
let started = false;
let currentKey = KEY;

const keyFor = (id) => (id ? `${KEY}:${id}` : KEY);
function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
// photos d'avant la maison : elles appartiennent à la première créature
function migrateLegacy(store) {
  const first = store.roster?.[0]?.id;
  if (!first) return;
  try {
    const old = localStorage.getItem(KEY);
    if (old == null) return;
    if (localStorage.getItem(keyFor(first)) == null) localStorage.setItem(keyFor(first), old);
    localStorage.removeItem(KEY);
  } catch { /* stockage indisponible */ }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const store = useTamagotchiStore();
  effectScope(true).run(() => {
    watch(() => [store.activeId, store.roster?.[0]?.id], ([id]) => {
      migrateLegacy(store);
      currentKey = keyFor(id);
      photos.value = read(currentKey);
    }, { immediate: true });
  });
}

function save() {
  // si le stockage est plein, on retire les plus anciennes photos
  while (photos.value.length) {
    try {
      localStorage.setItem(currentKey, JSON.stringify(photos.value));
      return true;
    } catch {
      photos.value = photos.value.slice(0, -1);
    }
  }
  return false;
}

export function useGallery() {
  start();
  function addPhoto(data) {
    photos.value = [{ id: Date.now(), at: Date.now(), data }, ...photos.value].slice(0, MAX);
    save();
  }
  function removePhoto(id) {
    photos.value = photos.value.filter((p) => p.id !== id);
    try { localStorage.setItem(currentKey, JSON.stringify(photos.value)); } catch { /* rien à faire */ }
  }
  // remise à zéro complète : les albums de toutes les créatures sont vidés
  function clearPhotos() {
    photos.value = [];
    try {
      for (const k of Object.keys(localStorage)) if (k === KEY || k.startsWith(`${KEY}:`)) localStorage.removeItem(k);
    } catch { /* rien à faire */ }
  }
  return { photos, addPhoto, removePhoto, clearPhotos, max: MAX };
}
