<template>
  <!-- petit moment de découverte : « Elle a trouvé un ballon ! » (une nouveauté à la fois) -->
  <Transition name="unlock">
    <div v-if="card" :key="card.at" class="unlock" role="status" aria-live="polite">
      <span class="badge"><Icon :name="card.icon" class="badge-ic" /></span>
      <div class="txt">
        <span class="kicker">Nouveau !</span>
        <strong>{{ card.title }}</strong>
        <p>{{ card.text }}</p>
        <div class="btns">
          <button class="later" @click="dismiss">{{ card.cta ? "Plus tard" : "Super !" }}</button>
          <button v-if="card.cta" class="go" @click="go">{{ card.cta }}</button>
        </div>
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
      return { title: `${who()} a trouvé un ballon !`, text: "Il est posé dans l'herbe. Touche-le (ou ce bouton) pour jouer au foot avec elle.", cta: "Jouer au ballon", run: () => launchActivity("foot") };
    case "coins":
      return { title: "Tes premières pièces !", text: "Les parties, ses envies exaucées et les défis en rapportent. Garde-les pour lui faire plaisir." };
    case "sac": {
      const c = COLORS[store.tastes?.color]?.label?.toLowerCase();
      return { title: "Un t-shirt rien que pour elle", text: c ? `En ${c}, sa couleur préférée ! Il l'attend dans le Sac.` : "Dans sa couleur préférée ! Il l'attend dans le Sac.", cta: "Ouvrir le Sac", run: () => openPage("sac", { tab: "tenues", focus: "tshirt" }) };
    }
    case "boutique":
      return { title: "La boutique ouvre", text: "Des vêtements en plein de couleurs, des ingrédients et des objets pour jouer.", cta: "Visiter", run: () => openPage("boutique") };
    case "cuisine":
      return { title: "La cuisine est ouverte !", text: "Farine, œuf, lait : tu as tout ce qu'il faut pour des crêpes.", cta: "Faire des crêpes", run: () => openKitchen("crepes") };
    case "tele":
      return { title: "Une télé dans le pré", text: "Avec un petit canapé. Regardez un épisode ensemble : quelle chaîne préfère-t-elle ?", cta: "Regarder ensemble", run: () => launchActivity("tele") };
    case "defis":
      return pages().includes("jours")
        ? { title: "Les défis du jour", text: "Trois petits défis chaque jour, et un bonus si tu les fais tous.", cta: "Voir les défis", run: () => openPage("jours") }
        : { title: "Les défis du jour", text: "Trois petits défis chaque jour, et un bonus si tu les fais tous." };
    case "collection":
      return { title: "La collection", text: "Complète des ensembles de vêtements pour gagner des récompenses. L'épicerie s'agrandit aussi !", cta: "Voir la collection", run: () => openPage("sac", { tab: "collection" }) };
    case "course":
      return { title: "Des baskets !", text: "Elle peut faire la course maintenant : saute les obstacles et ramasse des fruits.", cta: "Faire la course", run: () => launchActivity("course") };
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
.unlock {
  position: fixed;
  left: 50%;
  top: calc(env(safe-area-inset-top, 0px) + 74px);
  z-index: 30;
  display: flex;
  gap: 12px;
  width: min(420px, calc(100% - 24px));
  box-sizing: border-box;
  padding: 14px;
  transform: translateX(-50%);
  border-radius: 24px;
  background: #fff;
  color: #2b3440;
  box-shadow: 0 12px 32px rgba(40, 55, 80, 0.25);
  font-family: "Nunito", system-ui, sans-serif;
}
.badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, #ffe58a, #ffb81a 70%);
  box-shadow: 0 4px 0 #d18a00, inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: wobble 1.6s ease-in-out 2;
}
.badge-ic { width: 30px; height: 30px; color: #fff; }
.txt { flex: 1; min-width: 0; display: grid; gap: 2px; }
.kicker { font-weight: 800; font-size: 12px; color: #3c9a22; text-transform: uppercase; letter-spacing: 0.5px; }
strong { font: 700 18px/1.2 "Fredoka", "Nunito", system-ui, sans-serif; }
p { margin: 2px 0 0; font-weight: 700; font-size: 14px; color: #5b6676; }
.btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.btns button {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  font: 800 14px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.later { background: #eef3f8; color: #4a5565; }
.go { background: linear-gradient(180deg, #7fdc5a, #4fbf34); color: #fff; box-shadow: 0 3px 0 #3c9a22; }
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
