<template>
  <!-- étape 0 : l'œuf à faire éclore -->
  <Transition name="fade">
    <div v-if="step === 0" class="overlay egg-screen">
      <p class="top">{{ store.veteran ? "Un œuf de mochignome vient d'arriver dans la maison..." : "Un œuf vient d'arriver chez toi..." }}</p>
      <button class="egg-btn" type="button" aria-label="Toucher l'œuf" @click="tap">
        <div class="egg" :class="[`crack-${crack}`, { wob, burst }]" :style="{ '--warm': heat / 12 }">
          <span class="spot s1" /><span class="spot s2" /><span class="spot s3" />
          <svg class="cracks" viewBox="0 0 100 130" aria-hidden="true">
            <polyline v-if="crack >= 1" points="50,30 44,44 54,52 46,64" />
            <polyline v-if="crack >= 2" points="20,70 34,66 38,80 52,76 60,90" />
            <polyline v-if="crack >= 3" points="80,60 68,70 74,84 62,96 70,110" />
          </svg>
        </div>
        <span class="shadow" />
      </button>
      <div class="ui-bar meter" aria-hidden="true"><i :style="{ width: `${(heat / 12) * 100}%` }" /></div>
      <p class="hint">{{ heat === 0 ? "Touche l'œuf pour le réchauffer !" : heat < 12 ? "Continue, il bouge !" : "Ça y est !" }}</p>
      <!-- 2e mochignome et suivants : l'œuf peut attendre au chaud, on retourne voir une autre -->
      <button v-if="backTo && heat < 12" class="ui-btn ui-btn--secondary ui-btn--sm later" type="button" @click="later">
        Plus tard, retourner voir {{ backTo.name }}
      </button>
    </div>
  </Transition>

  <!-- étape 1 : le nom -->
  <Transition name="fade">
    <div v-if="step === 1" class="overlay">
      <section class="card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div class="confetti" aria-hidden="true">
          <span v-for="i in 14" :key="i" :style="confetti[i - 1]" />
        </div>
        <div class="medal"><Icon name="solar:heart-bold-duotone" class="medal-icon" /></div>
        <h2 id="welcome-title">Un mochignome est né !</h2>
        <!-- son apparence, découverte à l'éclosion (lib/appearance.js) -->
        <div v-if="look" class="reveal" :class="`r-${look.rarity}`">
          <span class="reveal-swatch" :style="{ background: look.swatch }" aria-hidden="true" />
          <span class="reveal-txt">
            <span v-if="look.shout" class="ui-tag ui-tag--solid reveal-tag" :style="{ '--c': look.rarityColor }">
              <Icon name="solar:stars-bold-duotone" class="ic" />{{ look.shout }}
            </span>
            <strong class="reveal-name">{{ look.intro }}</strong>
          </span>
        </div>
        <p class="lead">Comment veux-tu l'appeler ?</p>
        <input
          v-model="name"
          class="field"
          type="text"
          maxlength="14"
          autocomplete="off"
          aria-label="Nom de ton mochignome"
          @keyup.enter="validateName"
        >
        <button class="cta" type="button" @click="validateName">Enchanté·e, {{ cleanName }} !</button>
      </section>
    </div>
  </Transition>

  <!-- étapes 2 à 4 : on lui montre quoi faire, sans bloquer l'écran -->
  <Transition name="hint">
    <div v-if="step >= 2 && step <= 4" :key="step" class="guide" role="status">
      <span class="guide-num">{{ step - 1 }}/3</span>
      <span class="guide-text">{{ guideText }}</span>
    </div>
  </Transition>

  <!-- étape 5 : la promesse de retour -->
  <Transition name="fade">
    <div v-if="step === 5" class="overlay">
      <section class="card" role="dialog" aria-modal="true" aria-labelledby="promise-title">
        <div class="medal"><Icon name="solar:hourglass-bold-duotone" class="medal-icon" /></div>
        <h2 id="promise-title">À tout à l'heure !</h2>
        <p class="lead">{{ store.name }} te dit : « Je reviens dans 2 minutes ! Repasse me voir, j'aurai sûrement une envie. »</p>
        <p class="small">Elle grandit avec toi, et elle n'est jamais en danger : prends soin d'elle à ton rythme.</p>
        <button class="cta" type="button" @click="finish">Compris !</button>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { appearanceText } from "~/lib/appearance";

const { store } = useCreatureMood();

// anciennes sauvegardes : pas d'onboarding du tout
const step = computed(() => (store.hatched && store.onboardStep == null ? 6 : store.onboardStep ?? 6));
const heat = computed(() => Math.min(12, store.eggHeat || 0));
const crack = computed(() => (heat.value >= 12 ? 3 : heat.value >= 8 ? 2 : heat.value >= 4 ? 1 : 0));

function buzz(p) {
  try {
    if (["0", "false", "off"].includes(localStorage.getItem("tamagotchi-haptics"))) return;
    navigator.vibrate?.(p);
  } catch { /* ignoré */ }
}

// --- œuf ---
const wob = ref(false);
const burst = ref(false);
let busy = false;
function tap() {
  if (busy) return;
  const h = store.tapEgg?.();
  wob.value = false;
  requestAnimationFrame(() => (wob.value = true));
  const now = typeof h === "number" ? h : store.eggHeat;
  buzz(now >= 12 ? [20, 40, 20] : [8]);
  if (now >= 12 || store.hatched) {
    busy = true;
    burst.value = true;
    setTimeout(() => {
      if (!store.hatched) store.hatch?.();
      store.setOnboardStep?.(1);
      burst.value = false;
      busy = false;
    }, 1300);
  }
}

// --- son apparence : « Menthe, toute ronde », « Prune tachetée, en goutte » + petit mot si elle est rare ---
const look = computed(() => {
  const a = store.appearance;
  if (!a || a.original) return null;
  const t = appearanceText(a);
  const intro = `${t.label}, ${t.shape.split(" · ")[0].toLowerCase()}`;
  return { ...t, intro };
});

// --- nom ---
const name = ref("");
watch(step, (s) => { if (s === 1 && !name.value) name.value = store.name || "Tama"; }, { immediate: true });
const cleanName = computed(() => name.value.trim() || store.name || "toi");
function validateName() {
  const n = name.value.trim();
  if (n) store.rename?.(n);
  // déjà un mochignome dans la maison : éclosion courte, pas de tutoriel
  if (store.veteran) {
    store.finishOnboarding?.();
    gameCommand("react", "calin");
    setTimeout(() => gameSay(`Coucou ! Moi c'est ${store.name}, je suis trop contente d'être là !`), 120);
    return;
  }
  store.setOnboardStep?.(2);
  gameCommand("react", "calin");
}

// l'œuf attend au chaud : retour vers un mochignome déjà éclos
const backTo = computed(() => (store.veteran ? (store.house || []).find((c) => !c.active && c.hatched) : null));
function later() {
  if (backTo.value) bringCreature(backTo.value.id);
}

// --- étapes guidées : on fait pulser la tuile attendue ---
const TARGET = { 2: "nourrir", 3: "jouer" };
const GUIDE = {
  2: () => `${store.name} a faim ! Touche « Manger » pour la nourrir.`,
  3: () => `${store.name} s'ennuie. Touche « Jouer » pour jouer avec elle.`,
  4: () => `Appuie sur ${store.name} pour la faire rire !`,
};
const guideText = computed(() => GUIDE[step.value]?.() || "");
let pulse = null;
function stopPulse() { clearInterval(pulse); pulse = null; }
watch(step, (s) => {
  stopPulse();
  const a = TARGET[s];
  if (!a) return;
  setTimeout(() => highlightAction(a), 400);
  pulse = setInterval(() => highlightAction(a), 3500);
}, { immediate: true });
onBeforeUnmount(stopPulse);

// --- promesse ---
function finish() {
  store.finishOnboarding?.();
  gameCommand("react", "calin");
}

const COLORS = ["#ff5c8a", "#ffc21a", "#21b8d6", "#7c5cff", "#2fd456"];
const confetti = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  background: COLORS[i % COLORS.length],
  animationDelay: `${(i % 5) * 0.12}s`,
  transform: `rotate(${(i * 47) % 180}deg)`,
}));
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  grid-template-columns: minmax(0, 360px);
  justify-content: center;
  background: rgba(30, 40, 70, 0.5);
}
.egg-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: linear-gradient(180deg, #fff3d6, #ffd9e2 60%, #e5dcff);
}
.top { margin: 0; font: 700 20px "Fredoka", "Nunito", system-ui, sans-serif; color: #5a4a6a; text-align: center; }
.later { margin-top: 6px; }
.hint { margin: 0; font: 800 15px "Nunito", system-ui, sans-serif; color: #6b5a7a; min-height: 20px; }
.egg-btn { position: relative; border: 0; background: none; padding: 20px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.egg {
  position: relative;
  width: 150px;
  height: 195px;
  border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
  background:
    radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.85), transparent 30%),
    linear-gradient(160deg, #fff7e6, #ffe3b0 55%, #ffc27a);
  box-shadow: inset -12px -14px 24px rgba(220, 130, 60, 0.35), 0 14px 26px rgba(90, 60, 100, 0.25),
    0 0 calc(var(--warm) * 40px) rgba(255, 150, 80, calc(var(--warm) * 0.8));
  overflow: hidden;
}
.egg.wob { animation: wob 0.35s ease-in-out; }
.egg.burst { animation: burst 1.2s ease-in forwards; }
.spot { position: absolute; border-radius: 50%; background: rgba(255, 150, 160, 0.55); }
.s1 { width: 26px; height: 26px; left: 28px; top: 90px; }
.s2 { width: 18px; height: 18px; right: 32px; top: 60px; }
.s3 { width: 22px; height: 22px; right: 46px; top: 125px; }
.cracks { position: absolute; inset: 0; width: 100%; height: 100%; }
.cracks polyline { fill: none; stroke: #8a5a30; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.shadow { position: absolute; left: 50%; bottom: 8px; width: 120px; height: 18px; transform: translateX(-50%); border-radius: 50%; background: rgba(60, 40, 80, 0.18); z-index: -1; }
@keyframes wob {
  20% { transform: rotate(-9deg) scale(1.03); }
  50% { transform: rotate(8deg) scale(0.98); }
  80% { transform: rotate(-3deg); }
}
@keyframes burst {
  0% { transform: scale(1); filter: brightness(1); }
  30% { transform: scale(1.12) rotate(-3deg); filter: brightness(1.3); }
  60% { transform: scale(1.18) rotate(3deg); filter: brightness(2); opacity: 1; }
  100% { transform: scale(1.5); filter: brightness(3); opacity: 0; }
}
.meter { --c: #ff8a6d; width: min(220px, 60vw); }

.card {
  position: relative;
  width: 100%;
  max-width: 340px;
  padding: 54px 22px 22px;
  border-radius: 34px;
  text-align: center;
  color: var(--ink);
  background: linear-gradient(180deg, var(--plate-hi), var(--plate-lo));
  box-shadow: 0 8px 0 var(--knob-side), 0 24px 50px rgba(30, 40, 70, 0.4), inset 0 2px 0 var(--glint);
}
.medal {
  position: absolute;
  top: -42px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 28%, #ffe7a3, #ffb300 55%, #e08a00);
  box-shadow: 0 0 0 6px #fff, 0 6px 0 6px #cfd9e4, 0 14px 24px rgba(30, 40, 70, 0.3);
  animation: bob 2.4s ease-in-out infinite;
}
.medal-icon { width: 44px; height: 44px; color: #fff; filter: drop-shadow(0 2px 0 #b06a00); }
@keyframes bob { 50% { transform: translateX(-50%) translateY(-5px) rotate(-4deg); } }
h2 { margin: 0; font: 700 30px "Fredoka", "Nunito", system-ui, sans-serif; }
.reveal {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 10px auto 2px;
  padding: 6px 14px 6px 6px;
  width: fit-content;
  max-width: 100%;
  border-radius: var(--r-pill);
  background: var(--surface-2);
  animation: pop 0.5s 0.2s cubic-bezier(0.3, 1.6, 0.5, 1) both;
}
.reveal-swatch { flex: none; width: 34px; height: 34px; border-radius: 50%; box-shadow: 0 0 0 3px #fff, var(--sh-1); }
.reveal-txt { display: grid; justify-items: start; gap: 2px; text-align: left; min-width: 0; }
.reveal-tag { font-size: 12px; }
.reveal-name { font: 700 16px/1.2 var(--font-title); color: var(--ink); }
.r-legendaire { box-shadow: 0 0 0 2px #ffd36a, 0 0 18px rgba(255, 200, 80, 0.55); }
@keyframes pop { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
.lead { margin: 6px 0 0; font-weight: 700; font-size: 15px; line-height: 1.4; opacity: 0.85; }
.small { margin: 10px 0 0; font-weight: 600; font-size: 13px; line-height: 1.4; opacity: 0.65; }
.field {
  width: 100%;
  margin-top: 14px;
  padding: 12px 14px;
  border: 2px solid var(--ui-line);
  border-radius: 16px;
  background: var(--surface);
  color: var(--ink);
  font: 700 20px "Fredoka", "Nunito", system-ui, sans-serif;
  text-align: center;
}
.field:focus { outline: none; border-color: var(--accent); }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  margin-top: 18px;
  padding: 14px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #7fdc5a, #4fbf34);
  color: #fff;
  font: 700 18px "Fredoka", "Nunito", system-ui, sans-serif;
  box-shadow: 0 5px 0 #3c9a22, 0 10px 18px rgba(30, 50, 80, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.cta:active { transform: translateY(4px); box-shadow: 0 1px 0 #3c9a22; }

.guide {
  position: fixed;
  left: 50%;
  top: calc(env(safe-area-inset-top, 0px) + 92px);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(92vw, 380px);
  transform: translateX(-50%);
  padding: 10px 14px;
  border-radius: 20px;
  background: var(--surface);
  box-shadow: var(--ui-sh-3), 0 0 0 2px color-mix(in srgb, var(--accent) 45%, var(--surface));
  pointer-events: none;
}
.guide-num { flex: none; padding: 3px 9px; border-radius: 999px; background: var(--accent); color: #fff; font: 800 12px "Nunito", system-ui, sans-serif; }
.guide-text { font: 700 14px/1.3 "Nunito", system-ui, sans-serif; color: var(--ink); }

.confetti { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
.confetti span { position: absolute; top: -10px; width: 8px; height: 12px; border-radius: 2px; opacity: 0; animation: fall 1.6s ease-in forwards; }
@keyframes fall {
  0% { opacity: 1; transform: translateY(0) rotate(0); }
  100% { opacity: 0; transform: translateY(260px) rotate(320deg); }
}
.fade-enter-active, .fade-leave-active, .hint-enter-active, .hint-leave-active { transition: opacity 0.3s, transform 0.35s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.hint-enter-from, .hint-leave-to { opacity: 0; transform: translate(-50%, -10px); }
@media (prefers-reduced-motion: reduce) {
  .medal, .confetti span, .egg.wob, .reveal { animation: none; }
}
</style>
