<template>
  <div class="sheet-content">
    <!-- Nom -->
    <form class="block" @submit.prevent="save">
      <h3><Icon name="solar:heart-bold-duotone" size="20" /> Son nom</h3>
      <div class="row">
        <input id="pet-name" v-model="draft" maxlength="16" autocomplete="off" :placeholder="store.name" aria-label="Son nom">
        <button class="btn primary" type="submit" :disabled="!draft.trim() || draft.trim() === store.name">Renommer</button>
      </div>
      <p v-if="saved" class="ok">C'est noté, elle s'appelle maintenant {{ store.name }}.</p>
    </form>

    <!-- Rappels -->
    <section class="block">
      <h3><Icon name="solar:bell-bold-duotone" size="20" /> Rappels</h3>
      <p v-if="permission === 'denied'" class="warn">Les notifications sont bloquées dans ton navigateur. Autorise-les dans les réglages du site, ou utilise le rappel d'agenda ci-dessous.</p>
      <label v-if="supported" class="switch-row">
        <span>Prévenir quand elle a besoin de moi</span>
        <input type="checkbox" class="switch" :checked="enabled" :disabled="permission === 'denied'" @change="toggleNotif($event.target.checked)">
      </label>
      <p v-else class="warn">Ce navigateur ne gère pas les notifications. Le rappel d'agenda fonctionne partout.</p>
      <label class="switch-row">
        <span>Heure du rappel quotidien</span>
        <select :value="hour" aria-label="Heure du rappel" @change="setHour($event.target.value)">
          <option v-for="h in hours" :key="h" :value="h">{{ h }} h</option>
        </select>
      </label>
      <p class="info"><Icon name="solar:moon-sleep-bold-duotone" size="16" /> Plage calme : de {{ quietFrom }} h à {{ quietTo }} h, aucun rappel. Deux rappels par jour au maximum.</p>
      <div class="row">
        <button v-if="installable" class="btn" @click="install"><Icon name="solar:download-minimalistic-bold" size="16" /> Installer l'appli</button>
        <button class="btn" @click="downloadIcs"><Icon name="solar:calendar-add-bold-duotone" size="16" /> Ajouter au calendrier</button>
      </div>
      <p v-if="installed" class="ok"><Icon name="solar:check-circle-bold" size="16" /> L'appli est installée.</p>
      <p class="honest">Sans serveur, les rappels n'arrivent que si l'appli est installée et récemment ouverte ; sinon utilise le rappel d'agenda, qui marche toujours.</p>
      <p v-if="isIos" class="honest"><Icon name="solar:smartphone-bold-duotone" size="16" /> Sur iPhone : ajoute l'appli à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »). Appli fermée, seul le rappel d'agenda te préviendra.</p>
    </section>

    <!-- Vibrations -->
    <section class="block">
      <h3><Icon name="solar:smartphone-bold-duotone" size="20" /> Vibrations</h3>
      <label class="switch-row">
        <span>Petites vibrations pendant les soins</span>
        <input type="checkbox" class="switch" :checked="haptics" @change="setHaptics($event.target.checked)">
      </label>
    </section>

    <!-- Affichage -->
    <section class="block">
      <h3><Icon name="solar:palette-bold-duotone" size="20" /> Affichage</h3>
      <div class="swatches">
        <button v-for="(p, key) in PALETTES" :key="key" class="swatch" :class="{ on: store.palette === key }" :aria-pressed="store.palette === key" @click="store.palette = key">
          <span class="chip" :style="{ background: `linear-gradient(135deg, ${p.sky.top}, ${p.world.grass[0]})` }" />
          {{ p.label }}
        </button>
      </div>
    </section>

    <!-- Nouvelle partie -->
    <section class="block danger">
      <h3><Icon name="solar:refresh-bold" size="20" /> Nouvelle partie</h3>
      <p>Une nouvelle créature remplace {{ store.name }} : jauges, caractère, niveau et succès repartent de zéro. Les photos restent dans la galerie.</p>
      <button v-if="!confirming" class="btn" @click="confirming = true">Recommencer…</button>
      <div v-else class="row">
        <button class="btn red" @click="restart">Oui, recommencer</button>
        <button class="btn" @click="confirming = false">Annuler</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { PALETTES } from "~/lib/palettes";

const { store } = useCreatureMood();
const { supported, permission, enabled, hour, quietFrom, quietTo, installable, installed, isIos, enable, disable, setHour: setH, install, downloadIcs } = useNotifications();
const hours = Array.from({ length: 24 }, (_, i) => i).filter((h) => h >= 8 && h < 21);
const draft = ref("");
const saved = ref(false);
const confirming = ref(false);
const haptics = ref(true);

// à chaque ouverture : champ prérempli, messages remis à zéro
draft.value = store.name;
try { haptics.value = localStorage.getItem("tamagotchi-haptics") !== "off"; } catch { /* stockage indisponible */ }

function save() {
  store.rename(draft.value);
  saved.value = true;
}
async function toggleNotif(on) {
  if (on) {
    const ok = await enable();
    if (!ok) gameToast("Notifications refusées : le rappel d'agenda reste possible.", "solar:bell-bold-duotone");
  } else disable();
}
function setHour(h) { setH(h); }
function setHaptics(on) {
  haptics.value = on;
  try { localStorage.setItem("tamagotchi-haptics", on ? "on" : "off"); } catch { /* stockage indisponible */ }
  if (on) navigator.vibrate?.(15);
}
function restart() {
  store.resetGame();
  confirming.value = false;
  gameBus.sheet = null;
  gameToast(`Bienvenue à ${store.name} !`, "solar:heart-bold-duotone");
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
h3 { margin: 0; display: flex; align-items: center; gap: 8px; font: 600 17px "Fredoka", system-ui, sans-serif; }
.switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; font-weight: 800; font-size: 15px; }
.switch { appearance: none; flex: none; width: 52px; height: 30px; border-radius: 15px; background: var(--plate-lo); position: relative; cursor: pointer; box-shadow: inset 1px 1px 4px var(--plate-shade); transition: background 0.2s; }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 3px rgba(0,0,0,0.25); transition: transform 0.2s; }
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(22px); }
.switch:disabled { opacity: 0.5; }
select { min-height: 44px; padding: 0 10px; border: 0; border-radius: 12px; background: #fff; color: var(--ink); font: 800 15px "Nunito", system-ui, sans-serif; box-shadow: inset 2px 2px 5px var(--plate-shade); }
.info, .honest { display: flex; gap: 6px; align-items: flex-start; }
.honest { font-size: 13px !important; }
.warn { color: #c2410c !important; }
@media (prefers-reduced-motion: reduce) { .switch, .switch::after { transition: none; } }
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
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px;
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
