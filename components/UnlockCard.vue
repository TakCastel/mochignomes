<template>
  <!-- petit moment de découverte : « Elle a trouvé un ballon ! » (une nouveauté à la fois) -->
  <Transition name="unlock">
    <div v-if="card" :key="card.at" class="unlock" role="status" aria-live="polite">
      <div class="head">
        <span class="ui-medal ui-medal--gold badge"><Icon :name="card.icon" class="ic" /></span>
        <div class="txt">
          <span class="ui-kicker">Nouveau !</span>
          <strong>{{ card.title }}</strong>
        </div>
      </div>
      <p class="ui-text">{{ card.text }}</p>
      <div class="ui-actions">
        <button class="ui-btn ui-btn--secondary ui-btn--sm" @click="dismiss">{{ card.cta ? "Plus tard" : "Super !" }}</button>
        <button v-if="card.cta" class="ui-btn ui-btn--primary ui-btn--sm" @click="go">{{ card.cta }}</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import { COLORS } from "~/lib/catalog";

const { store } = useCreatureMood();
const turn = useOverlayTurn();
let hideTimer = null;

const who = () => store.name || "Elle";
const pages = () => store.unlockedPages || [];

// texte, bouton et destination de chaque nouveauté (clés de lib/growth.js FEATURES)
function describe(key) {
  switch (key) {
    case "ballon":
      return { title: `${who()} a trouvé un ballon !`, text: "Touche ce bouton pour jouer au ballon avec elle !", cta: "Jouer au ballon", run: () => launchActivity("foot") };
    case "coins":
      return { title: "Tes premières pièces !", text: "Garde-les bien : très vite, une boutique ouvre pour lui acheter des vêtements de toutes les couleurs. Les parties, ses envies exaucées et les défis en rapportent." };
    case "sac": {
      const c = COLORS[store.tastes?.color]?.label?.toLowerCase();
      return { title: "Un t-shirt rien que pour elle", text: c ? `En ${c}, sa couleur préférée ! Il l'attend dans le Sac.` : "Dans sa couleur préférée ! Il l'attend dans le Sac.", cta: "Ouvrir le Sac", run: () => openPage("sac", { tab: "tenues", focus: "tshirt" }) };
    }
    case "boutique":
      return { title: "La boutique ouvre", text: "Des vêtements en plein de couleurs, des ingrédients et des objets pour jouer.", cta: "Visiter", run: () => openPage("boutique") };
    case "cuisine":
      return { title: "La cuisine est ouverte !", text: "Farine, œuf, lait : tu as tout ce qu'il faut pour des crêpes.", cta: "Faire des crêpes", run: () => openKitchen("crepes") };
    case "tele":
      return { title: "Une télé pour vous deux", text: "Avec un petit canapé. Regardez un épisode ensemble : quelle chaîne préfère-t-elle ?", cta: "Regarder ensemble", run: () => launchActivity("tele") };
    case "defis":
      return pages().includes("jours")
        ? { title: "Les défis du jour", text: "Trois petits défis chaque jour, et un bonus si tu les fais tous.", cta: "Voir les défis", run: () => openPage("jours") }
        : { title: "Les défis du jour", text: "Trois petits défis chaque jour, et un bonus si tu les fais tous." };
    case "collection":
      return { title: "La collection", text: "Complète des ensembles de vêtements pour gagner des récompenses. L'épicerie s'agrandit aussi !", cta: "Voir la collection", run: () => openPage("sac", { tab: "collection" }) };
    case "course":
      return { title: "Des baskets !", text: "Elle peut faire la course maintenant : saute les obstacles et ramasse des fruits.", cta: "Faire la course", run: () => launchActivity("course") };
    case "maison":
      return { title: "Une nouvelle place pour un mochignome !", text: "Un petit nid tout chaud s'est libéré dans la maison. Tu peux adopter un œuf de mochignome : un seul dans le pré à la fois, les autres se reposent au chaud.", cta: "Voir la maison", run: () => openPage("elle", { focus: "maison" }) };
    case "etoiles":
      return { title: "Les Étoiles", text: "Une récompense rare, gagnée en maîtrisant ses jeux. En voici 3 pour commencer !", cta: "Voir la boutique", run: () => openPage("boutique") };
    default:
      return null;
  }
}

const card = computed(() => {
  const ev = store.unlockEvent;
  // une carte à la fois : attend son tour (retrouvailles d'abord) et l'écran principal libre
  if (!ev || ev.seen || turn.value !== "unlock") return null;
  const d = describe(ev.key);
  if (!d) return null;
  return { ...d, icon: ev.icon || "solar:gift-bold-duotone", at: ev.at };
});

// s'efface tout seul au bout d'un moment (la nouveauté reste accessible)
watch(() => card.value?.at, (at) => {
  clearTimeout(hideTimer);
  if (at) hideTimer = setTimeout(() => store.ackUnlock(), 16000);
}, { immediate: true });
onBeforeUnmount(() => clearTimeout(hideTimer));

function dismiss() {
  store.ackUnlock();
}
function go() {
  const run = card.value?.run;
  dismiss();
  run?.();
}
</script>

<style scoped>
/* posée dans le ciel libre, sous la carte de profil (jamais par-dessus) */
.unlock {
  position: fixed;
  left: 50%;
  top: calc(env(safe-area-inset-top, 0px) + clamp(10px, 1.8vh, 18px) + 84px);
  z-index: 30;
  display: grid;
  gap: 10px;
  width: min(420px, calc(100% - 28px));
  box-sizing: border-box;
  padding: var(--s-4);
  transform: translateX(-50%);
  border-radius: var(--r-lg);
  background: linear-gradient(180deg, var(--panel-top), var(--panel-bottom));
  color: var(--ink);
  box-shadow: var(--sh-3), var(--hl);
}
.head { display: flex; align-items: center; gap: var(--s-3); min-width: 0; }
.badge { width: 52px; height: 52px; animation: wobble 1.6s ease-in-out 2; }
.badge .ic { width: 28px; height: 28px; }
.txt { flex: 1; min-width: 0; display: grid; gap: 2px; }
strong { font: 700 var(--t-xl)/1.2 var(--font-title); }
.ui-actions .ui-btn { flex: 0 1 auto; }
.ui-actions { justify-content: flex-end; }
.unlock-enter-active, .unlock-leave-active { transition: transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1), opacity 0.25s; }
.unlock-enter-from, .unlock-leave-to { transform: translate(-50%, -20px) scale(0.92); opacity: 0; }
@keyframes wobble {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg) scale(1.08); }
  50% { transform: rotate(8deg); }
  75% { transform: rotate(-4deg); }
}
@media (prefers-reduced-motion: reduce) {
  .badge { animation: none; }
  .unlock-enter-active, .unlock-leave-active { transition: none; }
}
</style>
