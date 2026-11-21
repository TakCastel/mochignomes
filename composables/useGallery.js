// Album photo de la créature, gardé dans ce navigateur (localStorage).
import { ref } from "vue";

const KEY = "tamagotchi-photos";
const MAX = 12;
const photos = ref([]);
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    photos.value = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    photos.value = [];
  }
}

function save() {
  // si le stockage est plein, on retire les plus anciennes photos
  while (photos.value.length) {
    try {
      localStorage.setItem(KEY, JSON.stringify(photos.value));
      return true;
    } catch {
      photos.value = photos.value.slice(0, -1);
    }
  }
  return false;
}

export function useGallery() {
  load();
  function addPhoto(data) {
    photos.value = [{ id: Date.now(), at: Date.now(), data }, ...photos.value].slice(0, MAX);
    save();
  }
  function removePhoto(id) {
    photos.value = photos.value.filter((p) => p.id !== id);
    try { localStorage.setItem(KEY, JSON.stringify(photos.value)); } catch { /* rien à faire */ }
  }
  // nouvelle créature : l'album de l'ancienne est vidé
  function clearPhotos() {
    photos.value = [];
    try { localStorage.removeItem(KEY); } catch { /* rien à faire */ }
  }
  return { photos, addPhoto, removePhoto, clearPhotos, max: MAX };
}
