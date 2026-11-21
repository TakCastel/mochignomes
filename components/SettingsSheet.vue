<template>
  <div class="ui-stack settings">
    <!-- Nom -->
    <form class="ui-card block" @submit.prevent="save">
      <h3 class="ui-section-title"><Icon name="solar:heart-bold-duotone" class="ic" />Son nom</h3>
      <div class="row">
        <input id="pet-name" v-model="draft" class="field" maxlength="16" autocomplete="off" :placeholder="store.name" aria-label="Son nom">
        <button class="ui-btn ui-btn--primary" type="submit" :disabled="!draft.trim() || draft.trim() === store.name">Renommer</button>
      </div>
      <p v-if="saved" class="ui-note ui-note--accent"><Icon name="solar:check-circle-bold" class="ic" />C'est noté, elle s'appelle maintenant {{ store.name }}.</p>
    </form>

    <!-- Rappels -->
    <section class="ui-card block">
      <h3 class="ui-section-title"><Icon name="solar:bell-bold-duotone" class="ic" />Rappels</h3>
      <p v-if="permission === 'denied'" class="ui-note ui-note--warn">Les notifications sont bloquées dans ton navigateur. Autorise-les dans les réglages du site, ou utilise le rappel d'agenda ci-dessous.</p>
      <label v-if="supported" class="switch-row">
        <span>Recevoir ses petits rappels</span>
        <input type="checkbox" class="switch" :checked="enabled" :disabled="permission === 'denied'" @change="toggleNotif($event.target.checked)">
      </label>
      <p v-else class="ui-note ui-note--warn">Ce navigateur ne gère pas les notifications. Le rappel d'agenda fonctionne partout.</p>
      <label class="switch-row">
        <span>Heure du rappel quotidien</span>
        <select class="field select" :value="hour" aria-label="Heure du rappel" @change="setHour($event.target.value)">
          <option v-for="h in hours" :key="h" :value="h">{{ h }} h</option>
        </select>
      </label>
      <p class="ui-caption info"><Icon name="solar:moon-sleep-bold-duotone" class="ic" />Plage calme : de {{ quietFrom }} h à {{ quietTo }} h, aucun rappel. Deux rappels par jour au maximum.</p>
      <div class="row">
        <button v-if="installable" class="ui-btn ui-btn--secondary ui-btn--sm" @click="install"><Icon name="solar:download-minimalistic-bold" class="ic" />Installer l'appli</button>
        <button class="ui-btn ui-btn--secondary ui-btn--sm" @click="downloadIcs"><Icon name="solar:calendar-add-bold-duotone" class="ic" />Ajouter au calendrier</button>
      </div>
      <p v-if="installed" class="ui-note ui-note--accent"><Icon name="solar:check-circle-bold" class="ic" />L'appli est installée.</p>
      <p class="ui-caption">Sans serveur, les rappels n'arrivent que si l'appli est installée et récemment ouverte ; sinon utilise le rappel d'agenda, qui marche toujours.</p>
      <p v-if="isIos" class="ui-caption info"><Icon name="solar:smartphone-bold-duotone" class="ic" />Sur iPhone : ajoute l'appli à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »). Appli fermée, seul le rappel d'agenda te préviendra.</p>
    </section>

    <!-- Vibrations -->
    <section class="ui-card block">
      <h3 class="ui-section-title"><Icon name="solar:smartphone-bold-duotone" class="ic" />Vibrations</h3>
      <label class="switch-row">
        <span>Petites vibrations pendant les soins</span>
        <input type="checkbox" class="switch" :checked="haptics" @change="setHaptics($event.target.checked)">
      </label>
    </section>

    <!-- Affichage -->
    <section class="ui-card block">
      <h3 class="ui-section-title"><Icon name="solar:palette-bold-duotone" class="ic" />Affichage</h3>
      <div class="palettes">
        <button v-for="(p, key) in PALETTES" :key="key" class="ui-tile pal" :class="{ 'is-on': store.palette === key }" :aria-pressed="store.palette === key" @click="store.palette = key">
          <span class="pal-chip" :style="{ background: `linear-gradient(135deg, ${p.sky.top}, ${p.world.grass[0]})` }" />
          <span class="ui-tile-sub pal-label">{{ p.label }}</span>
        </button>
      </div>
    </section>

    <!-- Nouvelle partie -->
    <section class="ui-card block">
      <h3 class="ui-section-title"><Icon name="solar:refresh-bold" class="ic danger" />Nouvelle partie</h3>
      <p class="ui-text">Une nouvelle créature remplace {{ store.name }} : jauges, caractère, niveau et succès repartent de zéro. Ses photos sont effacées.</p>
      <button v-if="!confirming" class="ui-btn ui-btn--secondary ui-btn--sm start" @click="confirming = true">Recommencer…</button>
      <div v-else class="ui-actions">
        <button class="ui-btn ui-btn--secondary ui-btn--sm" @click="confirming = false">Annuler</button>
        <button class="ui-btn ui-btn--danger ui-btn--sm" @click="restart">Oui, recommencer</button>
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
const { clearPhotos } = useGallery();
function restart() {
  store.resetGame();
  clearPhotos();
  confirming.value = false;
  gameBus.sheet = null;
  gameToast(`Bienvenue à ${store.name} !`, "solar:heart-bold-duotone");
}
</script>

<style scoped>
.settings { padding-bottom: var(--s-2); }
.block { display: grid; gap: 10px; }
.block .ui-section-title { margin: 0; }
.ic.danger { color: var(--danger); }
.row { display: flex; gap: var(--s-2); flex-wrap: wrap; }
.start { justify-self: start; }
.info { display: flex; gap: 6px; align-items: flex-start; }
.info .ic { flex: none; width: 16px; height: 16px; margin-top: 1px; }

/* champ : creux doux, pas de filet */
.field {
  min-height: 48px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--ink);
  font: 800 var(--t-lg) var(--font-text);
  box-shadow: inset 0 2px 4px rgba(40, 55, 80, 0.1);
  user-select: text;
}
input.field { flex: 1; min-width: 0; }
.field:focus { outline: none; box-shadow: inset 0 2px 4px rgba(40, 55, 80, 0.1), 0 0 0 3px var(--accent-hi); }
.select { flex: none; min-height: var(--tap); font-size: 15px; }

.switch-row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-3); min-height: 48px; font: 800 15px/1.3 var(--font-text); color: var(--ink); }
.switch { appearance: none; flex: none; position: relative; width: 52px; height: 30px; margin: 0; border-radius: 15px; background: var(--surface-3); cursor: pointer; box-shadow: inset 0 1px 3px rgba(40, 55, 80, 0.18); transition: background 0.2s; }
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 3px rgba(0, 0, 0, 0.25); transition: transform 0.2s; }
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(22px); }
.switch:disabled { opacity: 0.5; }

.palettes { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: var(--s-2); }
.pal { padding: 8px 2px 6px; gap: 6px; }
.pal-chip { width: 36px; height: 36px; border-radius: 50%; box-shadow: inset 0 -3px 4px rgba(0, 0, 0, 0.15), inset 0 2px 2px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.15); }
.pal-label { color: var(--ink-2); font-weight: 800; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .switch, .switch::after { transition: none; } }
</style>
