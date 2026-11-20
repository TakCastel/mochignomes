<template>
  <div class="sheet-content">
    <form class="block" @submit.prevent="save">
      <label for="pet-name">Son nom</label>
      <div class="row">
        <input id="pet-name" v-model="draft" maxlength="16" autocomplete="off" :placeholder="store.name">
        <button class="btn primary" type="submit" :disabled="!draft.trim() || draft.trim() === store.name">Renommer</button>
      </div>
      <p v-if="saved" class="ok">C'est noté, elle s'appelle maintenant {{ store.name }}.</p>
    </form>

    <div class="block">
      <strong>Couleur de la console</strong>
      <div class="swatches" role="radiogroup" aria-label="Couleur de la console">
        <button
          v-for="(t, key) in SHELLS"
          :key="key"
          class="swatch"
          role="radio"
          :aria-checked="store.shell === key"
          :class="{ on: store.shell === key }"
          @click="store.shell = key"
        >
          <span class="chip" :style="{ background: `linear-gradient(160deg, ${t.hi}, ${t.mid} 55%, ${t.lo})` }" />
          <span>{{ t.label }}</span>
        </button>
      </div>
    </div>

    <div class="block danger">
      <strong>Nouvelle partie</strong>
      <p>Une nouvelle créature remplace {{ store.name }} : jauges, caractère, niveau et succès repartent de zéro. Les photos restent dans la galerie.</p>
      <button v-if="!confirming" class="btn" @click="confirming = true">Recommencer…</button>
      <div v-else class="row">
        <button class="btn red" @click="restart">Oui, recommencer</button>
        <button class="btn" @click="confirming = false">Annuler</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { SHELLS } from "~/lib/gameUi";

const { store } = useCreatureMood();
const draft = ref("");
const saved = ref(false);
const confirming = ref(false);

// à chaque ouverture : champ prérempli, messages remis à zéro
draft.value = store.name;

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
  background: #fff;
  box-shadow: 0 3px 0 var(--plate-lo), 0 6px 14px var(--plate-shade);
}
label, .block strong { font-weight: 800; font-size: 15px; }
.block p { margin: 0; font-size: 14px; color: color-mix(in srgb, var(--ink) 78%, #fff); font-weight: 700; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: #ffffff;
  color: var(--ink);
  font: 800 16px "Nunito", system-ui, sans-serif;
  box-shadow: inset 2px 2px 5px var(--plate-shade);
  user-select: text;
}
input:focus { outline: 3px solid var(--accent-hi); }
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
.btn:disabled { opacity: 0.5; cursor: default; }
.btn.primary { background: linear-gradient(180deg, var(--accent-hi), var(--accent)); color: #fff; box-shadow: 0 3px 0 var(--accent-lo); }
.btn.red { background: linear-gradient(180deg, #ff7a7a, #e04848); color: #fff; box-shadow: 0 3px 0 #a82727; }
.ok { color: #2f9e44 !important; }
.swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.swatch {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 6px 2px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--ink);
  font: 800 11px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.swatch.on { background: #ffffff; box-shadow: 0 3px 0 var(--knob-side); }
.chip {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  box-shadow: inset 0 -3px 4px rgba(0, 0, 0, 0.15), inset 0 2px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.15);
}
.swatch.on .chip { box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--accent); }
</style>
