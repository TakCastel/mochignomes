<template>
  <div class="ui-page jours">
    <!-- bonus du jour -->
    <section v-if="store.pendingBonus > 0" class="ui-card bonus">
      <span class="ui-medal ui-medal--gold ui-medal--sm"><Icon name="solar:gift-bold-duotone" class="ic" /></span>
      <div class="grow">
        <strong class="ui-row-title">Bonus du jour</strong>
        <span class="ui-caption">+{{ store.pendingBonus }} xp{{ store.pendingBonusCoins ? ` et ${store.pendingBonusCoins} pièces` : "" }} t'attendent</span>
      </div>
      <button class="ui-btn ui-btn--gold ui-btn--sm" @click="claimBonus">Récupérer</button>
    </section>

    <!-- défis (après leur découverte) -->
    <section v-if="store.features?.defis" class="ui-card">
      <h3 class="ui-section-title"><Icon name="solar:cup-star-bold-duotone" class="ic" />Les 3 défis du jour</h3>
      <ul class="quests">
        <li v-for="q in quests" :key="q.id" class="ui-row is-well" :class="{ claimed: q.claimed }">
          <div class="grow">
            <strong class="q-label">{{ q.label }}</strong>
            <div class="ui-bar ui-bar--thin"><i :style="{ width: Math.min(100, (q.progress / q.target) * 100) + '%' }" /></div>
            <span class="ui-caption">{{ Math.min(q.progress, q.target) }} / {{ q.target }}</span>
          </div>
          <Icon v-if="q.claimed" name="solar:check-circle-bold" class="done-ic" aria-label="Récupéré" />
          <button v-else class="ui-btn ui-btn--primary ui-btn--sm" :disabled="q.progress < q.target" @click="claim(q)">{{ rewardLabel(q) }}</button>
        </li>
        <li v-if="!quests.length" class="ui-empty">Les défis arrivent avec le prochain jour.</li>
      </ul>
      <button v-if="store.questBonusReady" class="ui-btn ui-btn--gold ui-btn--block mt" @click="claimQuestBonus">
        <Icon name="solar:gift-bold-duotone" class="ic" />Bonus des 3 défis
      </button>
      <p v-else-if="store.questsAllDone" class="ui-foot-note mt">Tout est fait, à demain !</p>
    </section>

    <!-- jours passés ensemble (cumulés : rien à perdre si on rate un jour) -->
    <section class="ui-card streak">
      <div class="top">
        <span class="ui-thumb ui-thumb--lg days-ic"><Icon name="solar:calendar-mark-bold-duotone" class="ic" /></span>
        <div class="grow">
          <strong class="big">{{ store.totalDays || 0 }} jour{{ (store.totalDays || 0) > 1 ? "s" : "" }} ensemble</strong>
          <span class="ui-caption">{{ store.streak || 0 }} de suite · record : {{ store.bestStreak || 0 }}</span>
        </div>
      </div>
      <div class="pips" aria-hidden="true">
        <span v-for="i in 7" :key="i" class="pip" :class="{ on: i <= pipsOn }" />
      </div>
      <p class="ui-caption">Un cadeau à 7, 14 et 30 jours de jeu. Rater un jour ne fait rien perdre.</p>
    </section>

    <!-- journal narratif -->
    <section class="ui-card">
      <h3 class="ui-section-title"><Icon name="solar:book-bookmark-bold-duotone" class="ic" />Journal de {{ store.name || "ton mochignome" }}</h3>
      <ul v-if="entries.length" class="log">
        <li v-for="e in entries" :key="e.id">
          <span class="ui-thumb log-ic"><Icon :name="e.icon || 'solar:book-bookmark-bold-duotone'" class="ic" /></span>
          <div class="grow">
            <span class="log-txt">{{ e.text }}</span>
            <time class="ui-caption">{{ when(e.t) }}</time>
          </div>
        </li>
      </ul>
      <div v-else class="ui-empty"><p>Rien à raconter pour l'instant. Les petits moments s'écriront ici.</p></div>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";

const { store } = useCreatureMood();
const quests = computed(() => store.quests?.list || []);
const pipsOn = computed(() => ((store.totalDays || 0) > 0 ? ((store.totalDays - 1) % 7) + 1 : 0));
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
.grow { flex: 1; min-width: 0; display: grid; gap: 3px; }
.mt { margin-top: var(--s-3); }
.bonus { display: flex; align-items: center; gap: var(--s-3); background: linear-gradient(180deg, #fff8e0, #ffeec0); }
.quests, .log { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.quests .ui-row { min-height: 0; }
.quests .claimed { opacity: 0.6; }
.q-label { font: 800 15px/1.25 var(--font-text); color: var(--ink); }
.done-ic { flex: none; width: 32px; height: 32px; margin: 0 8px; color: var(--accent-lo); }

/* jours ensemble : style propre (plus de « flamme » orange) */
.top { display: flex; align-items: center; gap: var(--s-3); }
.days-ic { background: var(--sel-bg); }
.days-ic .ic { color: var(--accent-lo); }
.big { display: block; font: 700 22px/1.15 var(--font-title); }
.pips { display: flex; gap: 6px; margin: var(--s-3) 0 var(--s-2); }
.pip { flex: 1; height: 10px; border-radius: var(--r-pill); background: var(--surface-3); }
.pip.on { background: linear-gradient(180deg, var(--accent-hi), var(--accent)); }

.log li { display: flex; gap: 10px; align-items: flex-start; }
.log-ic { width: 36px; height: 36px; border-radius: 12px; }
.log-ic .ic { width: 22px; height: 22px; color: var(--ink-2); }
.log-txt { font: 700 var(--t-md)/1.35 var(--font-text); color: var(--ink); }
</style>
