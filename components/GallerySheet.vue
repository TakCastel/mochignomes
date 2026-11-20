<template>
  <div class="sheet-content">
    <div v-if="!photos.length" class="empty">
      <Icon name="ph:camera-fill" class="empty-icon" />
      <p>Appuie sur le bouton <strong>Photo</strong> pour immortaliser {{ store.name }}. Les photos restent dans ce navigateur.</p>
    </div>

    <ul v-else class="grid">
      <li v-for="p in photos" :key="p.id">
        <button class="thumb" :aria-label="`Photo du ${fmt(p.at)}`" @click="selected = p">
          <img :src="p.data" alt="">
        </button>
      </li>
    </ul>

    <div v-if="selected" class="viewer" @click.self="selected = null">
      <figure>
        <img :src="selected.data" :alt="`${store.name}, le ${fmt(selected.at)}`">
        <figcaption>{{ fmt(selected.at) }}</figcaption>
        <div class="row">
          <button class="btn primary" @click="share(selected)">Enregistrer</button>
          <button class="btn" @click="remove(selected)">Supprimer</button>
          <button class="btn" @click="selected = null">Fermer</button>
        </div>
      </figure>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const { store } = useCreatureMood();
const { photos, removePhoto } = useGallery();
const selected = ref(null);

const fmt = (t) => new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

// Partage natif sur téléphone, sinon téléchargement
async function share(p) {
  const fileName = `${store.name || "tamagotchi"}-${p.id}.jpg`;
  try {
    const blob = await (await fetch(p.data)).blob();
    const file = new File([blob], fileName, { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: store.name });
      return;
    }
  } catch { /* on passe au téléchargement */ }
  const a = document.createElement("a");
  a.href = p.data;
  a.download = fileName;
  a.click();
}
function remove(p) {
  removePhoto(p.id);
  selected.value = null;
}
</script>

<style scoped>
.empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 24px 12px;
  text-align: center;
  color: color-mix(in srgb, var(--ink) 78%, #fff);
  font-weight: 700;
}
.empty-icon { width: 60px; height: 60px; color: #ff8a3d; }
.grid {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.thumb {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  padding: 4px;
  border: 0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 3px 4px 8px var(--plate-shade), -2px -2px 6px #fff;
  cursor: pointer;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block; }
.viewer {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(20, 10, 30, 0.75);
}
figure { margin: 0; max-width: 420px; width: 100%; text-align: center; }
figure img { width: 100%; max-height: 65vh; object-fit: contain; border-radius: 20px; border: 6px solid #fff; }
figcaption { margin: 8px 0; color: #fff; font-weight: 800; }
.row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.btn {
  padding: 10px 16px;
  border: 0;
  border-radius: 14px;
  background: #ffffff;
  color: var(--ink);
  font: 800 14px "Nunito", system-ui, sans-serif;
  box-shadow: 0 3px 0 var(--knob-side);
  cursor: pointer;
}
.btn.primary { background: linear-gradient(180deg, #ffb24d, #ff8a1f); color: #fff; box-shadow: 0 3px 0 #c45d00; }
</style>
