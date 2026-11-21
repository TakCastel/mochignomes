<template>
  <div class="jours">
    <!-- série -->
    <section class="card streak">
      <div class="top">
        <Icon name="solar:fire-bold-duotone" class="flame" />
        <div>
          <strong class="big">{{ store.streak || 0 }} jour{{ (store.streak || 0) > 1 ? "s" : "" }} de suite</strong>
          <span class="small">Record : {{ store.bestStreak || 0 }} · {{ store.totalDays || 0 }} jour{{ (store.totalDays || 0) > 1 ? "s" : "" }} passés ensemble</span>
        </div>
      </div>
      <div class="dots" aria-hidden="true">
        <span v-for="i in 7" :key="i" class="pip" :class="{ on: i <= pipsOn }" />
      </div>
      <p class="small">
        Jokers : <span v-for="j in 2" :key="j" class="joker" :class="{ on: j <= (store.jokers || 0) }">
          <Icon name="solar:star-bold-duotone" class="joker-ic" />
        </span>
        Un joker sauve ta série si tu rates un jour. Tu en gagnes un tous les 7 jours.
      </p>
    </section>

    <!-- bonus du jour -->
    <section v-if="store.pendingBonus > 0" class="card bonus">
      <Icon name="solar:gift-bold-duotone" class="gift" />
      <div class="grow">
        <strong>Bonus du jour</strong>
        <span class="small">+{{ store.pendingBonus }} xp{{ store.pendingBonusCoins ? ` et ${store.pendingBonusCoins} pièces` : "" }} t'attendent</span>
      </div>
      <button class="btn" @click="claimBonus">Récupérer</button>
    </section>

    <!-- défis (après leur découverte) -->
    <section v-if="store.features?.defis" class="card">
      <h3>Les 3 défis du jour</h3>
      <ul class="quests">
        <li v-for="q in quests" :key="q.id" :class="{ claimed: q.claimed }">
          <div class="grow">
            <strong>{{ q.label }}</strong>
            <div class="bar"><div class="fill" :style="{ width: Math.min(100, (q.progress / q.target) * 100) + '%' }" /></div>
            <span class="small">{{ Math.min(q.progress, q.target) }} / {{ q.target }}</span>
          </div>
          <button v-if="q.claimed" class="done" aria-label="Récupéré"><Icon name="solar:check-circle-bold" class="done-ic" /></button>
          <button v-else class="btn" :disabled="q.progress < q.target" @click="claim(q)">{{ rewardLabel(q) }}</button>
        </li>
        <li v-if="!quests.length" class="empty">Les défis arrivent avec le prochain jour.</li>
      </ul>
      <button v-if="store.questBonusReady" class="btn wide" @click="claimQuestBonus">
        <Icon name="solar:gift-bold-duotone" class="btn-ic" />Bonus des 3 défis
      </button>
      <p v-else-if="store.questsAllDone" class="small all-done">Tout est fait, à demain !</p>
    </section>

    <!-- journal narratif -->
    <section class="card">
      <h3>Journal de {{ store.name || "ta bestiole" }}</h3>
      <ul v-if="entries.length" class="log">
        <li v-for="e in entries" :key="e.id">
          <Icon :name="e.icon || 'solar:book-bookmark-bold-duotone'" class="log-ic" />
          <div class="grow">
            <span>{{ e.text }}</span>
            <time class="small">{{ when(e.t) }}</time>
          </div>
        </li>
      </ul>
      <p v-else class="small">Rien à raconter pour l'instant. Les petits moments s'écriront ici.</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const quests = computed(() => store.quests?.list || []);
const pipsOn = computed(() => ((store.streak || 0) > 0 ? ((store.streak - 1) % 7) + 1 : 0));
const entries = computed(() => (store.journal || []).slice(0, 40));

// les gains s'envolent en « +N » (CoinBurst) : pas de toast pour un défi
const rewardLabel = (q) => (store.features?.coins && q.coins ? `+${q.coins}` : `+${q.xp ?? 10} xp`);
function claim(q) {
  store.claimQuest(q.id);
}
function claimBonus() {
  store.claimBonus();
}
function claimQuestBonus() {
  const r = store.claimQuestBonus();
  if (r.ok) gameToast("Les 3 défis du jour sont faits, bravo !", "solar:cup-star-bold-duotone");
}
function when(t) {
  const d = new Date(t);
  const sameDay = new Date().toDateString() === d.toDateString();
  const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `Aujourd'hui, ${hm}` : `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}, ${hm}`;
}
</script>

<style scoped>
.jours { display: grid; gap: 12px; padding-bottom: 8px; }
.card { padding: 14px; border-radius: 22px; background: #fff; box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1); }
h3 { margin: 0 0 10px; font: 600 17px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink); }
.small { display: block; font-size: 13px; font-weight: 700; color: #6b7686; }
.grow { flex: 1; min-width: 0; display: grid; gap: 3px; }
.top { display: flex; align-items: center; gap: 12px; }
.flame { flex: none; width: 44px; height: 44px; color: #ff8a3d; }
.big { font: 700 22px "Fredoka", "Nunito", system-ui, sans-serif; display: block; }
.dots { display: flex; gap: 6px; margin: 12px 0 8px; }
.pip { flex: 1; height: 10px; border-radius: 999px; background: #e4e9ef; }
.pip.on { background: linear-gradient(180deg, #ffb070, #ff8a3d); }
.streak p.small { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.joker { display: inline-grid; }
.joker-ic { width: 20px; height: 20px; color: #cfd6df; }
.joker.on .joker-ic { color: #f0a500; }
.bonus { display: flex; align-items: center; gap: 12px; background: linear-gradient(180deg, #fff6d6, #ffe9a8); }
.gift { flex: none; width: 40px; height: 40px; color: #d9822b; }
.btn {
  flex: none;
  min-width: 64px;
  min-height: 48px;
  padding: 0 16px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, #7fdc5a, #4fbf34);
  box-shadow: 0 3px 0 #3c9a22;
  color: #fff;
  font: 800 15px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.btn:disabled { background: #e4e9ef; box-shadow: none; color: #9aa4b2; cursor: default; }
.quests, .log { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.quests li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 16px; background: #f4f7fb; }
.quests li.claimed { opacity: 0.6; }
.quests strong { font-size: 15px; }
.bar { height: 8px; border-radius: 999px; background: #dfe5ec; overflow: hidden; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(180deg, #7fdc5a, #44b82e); transition: width 0.4s; }
.done { flex: none; width: 48px; height: 48px; border: 0; background: none; }
.done-ic { width: 32px; height: 32px; color: #2f9e44; }
.empty { font-weight: 700; color: #6b7686; font-size: 14px; }
.log li { display: flex; gap: 10px; align-items: flex-start; font-weight: 700; font-size: 14px; color: var(--ink); }
.log-ic { flex: none; width: 24px; height: 24px; color: #7a8494; margin-top: 1px; }
.wide { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; margin-top: 12px; }
.btn-ic { width: 22px; height: 22px; }
.all-done { text-align: center; margin-top: 10px; }
</style>
