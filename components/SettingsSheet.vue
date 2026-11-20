<template>
  <BaseSheet :open="gameBus.sheet === 'reglages'" title="Réglages" icon="ph:gear-six-fill">
    <form class="block" @submit.prevent="save">
      <label for="pet-name">Son nom</label>
      <div class="row">
        <input id="pet-name" v-model="draft" maxlength="16" autocomplete="off" :placeholder="store.name">
        <button class="btn primary" type="submit" :disabled="!draft.trim() || draft.trim() === store.name">Renommer</button>
      </div>
      <p v-if="saved" class="ok">C'est noté, elle s'appelle maintenant {{ store.name }}.</p>
    </form>

    <div class="block danger">
      <strong>Nouvelle partie</strong>
      <p>Une nouvelle créature remplace {{ store.name }} : jauges, caractère, niveau et succès repartent de zéro. Les photos restent dans la galerie.</p>
      <button v-if="!confirming" class="btn" @click="confirming = true">Recommencer…</button>
      <div v-else class="row">
        <button class="btn red" @click="restart">Oui, recommencer</button>
        <button class="btn" @click="confirming = false">Annuler</button>
      </div>
    </div>
  </BaseSheet>
</template>

<script setup>
import { ref, watch } from "vue";

const { store } = useCreatureMood();
const draft = ref("");
const saved = ref(false);
const confirming = ref(false);

watch(() => gameBus.sheet, (s) => {
  if (s === "reglages") { draft.value = store.name; saved.value = false; confirming.value = false; }
});

function save() {
  store.rename(draft.value);
  saved.value = true;
}
function restart() {
  store.resetGame();
  confirming.value = false;
  gameBus.sheet = null;
  gameToast(`Bienvenue à ${store.name} !`, "ph:egg-crack-fill");
}
</script>

<style scoped>
.block {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  padding: 14px;
  border-radius: 20px;
  background: #f1e5d5;
  box-shadow: inset 2px 2px 6px rgba(140, 110, 80, 0.3), inset -2px -2px 6px #fff;
}
label, .block strong { font-weight: 800; font-size: 15px; }
.block p { margin: 0; font-size: 14px; color: #7a5236; font-weight: 700; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: #fffaf3;
  color: #4a2410;
  font: 800 16px "Nunito", system-ui, sans-serif;
  box-shadow: inset 2px 2px 5px rgba(140, 110, 80, 0.35);
  user-select: text;
}
input:focus { outline: 3px solid #a68cff; }
.btn {
  padding: 10px 16px;
  border: 0;
  border-radius: 14px;
  background: #fffaf3;
  color: #4a2410;
  font: 800 14px "Nunito", system-ui, sans-serif;
  box-shadow: 0 3px 0 #c9b296;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; cursor: default; }
.btn.primary { background: linear-gradient(180deg, #a68cff, #6f4fe0); color: #fff; box-shadow: 0 3px 0 #4b2fb0; }
.btn.red { background: linear-gradient(180deg, #ff7a7a, #e04848); color: #fff; box-shadow: 0 3px 0 #a82727; }
.ok { color: #2f9e44 !important; }
</style>
