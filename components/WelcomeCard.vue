<template>
  <Transition name="pop">
    <div v-if="open" class="overlay" @click.self="close">
      <section class="card" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div class="confetti" aria-hidden="true">
          <span v-for="i in 14" :key="i" :style="confetti[i - 1]" />
        </div>

        <div class="medal">
          <Icon :name="bonus ? 'ph:gift-fill' : 'ph:hand-waving-fill'" class="medal-icon" />
        </div>
        <h2 id="welcome-title">{{ title }}</h2>
        <p class="lead">{{ lead }}</p>

        <div v-if="bonus" class="streak">
          <div class="days">
            <span v-for="d in 7" :key="d" class="day" :class="{ on: d <= shownStreak, today: d === shownStreak }">
              <Icon name="ph:fire-fill" class="fire" />
            </span>
          </div>
          <p class="streak-text">
            <strong>{{ store.streak }} jour{{ store.streak > 1 ? "s" : "" }} d'affilée</strong>
            <span v-if="store.streak < 7"> · plus gros demain</span>
          </p>
        </div>

        <button class="cta" @click="claim">
          <template v-if="bonus">
            Récupérer
            <span class="reward"><Icon name="ph:star-fill" class="reward-star" />+{{ bonus }}</span>
          </template>
          <template v-else>Coucou {{ store.name }} !</template>
        </button>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

const { store, mood } = useCreatureMood();
const NEEDY = ["triste", "affamee", "cracra", "grognon", "malade", "fatiguee", "boudeuse"];
const open = ref(false);
const bonus = ref(0);
const away = ref(0);

const shownStreak = computed(() => Math.min(store.streak, 7));

function formatAway(s) {
  const h = Math.floor(s / 3600);
  if (h >= 48) return `${Math.floor(h / 24)} jours`;
  if (h >= 1) return `${h} h${h < 10 && s % 3600 > 600 ? ` ${Math.floor((s % 3600) / 60)}` : ""}`;
  return `${Math.max(1, Math.floor(s / 60))} min`;
}

const title = computed(() => {
  if (away.value < 60 && store.streak <= 1) return `Bienvenue !`;
  return "Te revoilà !";
});
const lead = computed(() => {
  if (away.value < 60 && store.streak <= 1) return `Voici ${store.name}. Prends-en bien soin, elle grandira avec toi.`;
  const t = formatAway(away.value);
  if (store.health <= 0) return `Ça faisait ${t}… ${store.name} a besoin d'un soin, vite !`;
  if (NEEDY.includes(mood.value)) return `Ça faisait ${t}. ${store.name} t'attendait, elle a besoin de toi.`;
  return `Ça faisait ${t}. ${store.name} est trop contente de te voir !`;
});

// confettis à positions fixes
const COLORS = ["#ff5c8a", "#ffc21a", "#21b8d6", "#7c5cff", "#2fd456"];
const confetti = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  background: COLORS[i % COLORS.length],
  animationDelay: `${(i % 5) * 0.12}s`,
  transform: `rotate(${(i * 47) % 180}deg)`,
}));

function close() {
  open.value = false;
}
function claim() {
  if (bonus.value) {
    const gained = store.claimBonus();
    gameToast(`+${gained} points !`, "ph:star-fill");
    gameCommand("react", "niveau");
  } else {
    gameCommand("react", "calin");
  }
  close();
}

onMounted(() => {
  // laisse le temps au store de calculer l'absence et le bonus du jour
  setTimeout(() => {
    bonus.value = store.pendingBonus;
    away.value = store.awaySeconds;
    open.value = bonus.value > 0 || away.value > 1800;
  }, 900);
});
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
  background: rgba(30, 15, 60, 0.45);
}
.card {
  position: relative;
  width: 100%;
  max-width: 340px;
  padding: 54px 22px 22px;
  border-radius: 34px;
  text-align: center;
  color: var(--ink);
  background: linear-gradient(180deg, #ffffff, var(--plate-lo));
  box-shadow: 0 8px 0 var(--knob-side), 0 24px 50px rgba(30, 15, 60, 0.4), inset 0 2px 0 #fff;
  overflow: visible;
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
  box-shadow: 0 0 0 6px #fff, 0 6px 0 6px var(--knob-side), 0 14px 24px rgba(30, 15, 60, 0.3);
  animation: bob 2.4s ease-in-out infinite;
}
.medal-icon { width: 44px; height: 44px; color: #fff; filter: drop-shadow(0 2px 0 #b06a00); }
@keyframes bob { 50% { transform: translateX(-50%) translateY(-5px) rotate(-4deg); } }
h2 {
  margin: 0;
  font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  font-size: 30px;
  font-weight: 700;
}
.lead { margin: 6px 0 0; font-weight: 700; font-size: 15px; line-height: 1.4; opacity: 0.85; }
.streak {
  margin-top: 16px;
  padding: 12px;
  border-radius: 22px;
  background: var(--plate-lo);
  box-shadow: inset 0 2px 5px var(--plate-shade), inset 0 -2px 2px #fff;
}
.days { display: flex; justify-content: center; gap: 4px; }
.day {
  display: grid;
  place-items: center;
  width: min(34px, 9vw);
  height: min(34px, 9vw);
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 2px var(--knob-side);
}
.fire { width: 20px; height: 20px; color: #c9c3d6; }
.day.on { background: radial-gradient(circle at 38% 30%, #ffd27a, #ff7a1a); box-shadow: 0 2px 0 #c2470a; }
.day.on .fire { color: #fff; }
.day.today { animation: glow 1.4s ease-in-out infinite; }
@keyframes glow { 50% { transform: scale(1.15); box-shadow: 0 2px 0 #c2470a, 0 0 14px rgba(255, 140, 30, 0.8); } }
.streak-text { margin: 10px 0 0; font-size: 14px; font-weight: 700; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  margin-top: 18px;
  padding: 14px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--accent-hi), var(--accent));
  color: #fff;
  font: 700 18px "Fredoka", "Nunito", system-ui, sans-serif;
  box-shadow: 0 5px 0 var(--accent-lo), 0 10px 18px var(--plate-shade), inset 0 2px 0 rgba(255, 255, 255, 0.35);
  cursor: pointer;
}
.cta:active { transform: translateY(4px); box-shadow: 0 1px 0 var(--accent-lo), inset 0 2px 0 rgba(255, 255, 255, 0.35); }
.reward {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px 3px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}
.reward-star { width: 18px; height: 18px; color: #ffd23f; }
.confetti { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
.confetti span {
  position: absolute;
  top: -10px;
  width: 8px;
  height: 12px;
  border-radius: 2px;
  opacity: 0;
  animation: fall 1.6s ease-in forwards;
}
@keyframes fall {
  0% { opacity: 1; transform: translateY(0) rotate(0); }
  100% { opacity: 0; transform: translateY(260px) rotate(320deg); }
}
.pop-enter-active { transition: opacity 0.25s; }
.pop-enter-active .card { transition: transform 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .card { transform: scale(0.7) translateY(30px); }
@media (prefers-reduced-motion: reduce) {
  .medal, .day.today, .confetti span { animation: none; }
}
</style>
