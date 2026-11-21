<template>
  <div class="ui-page elle">
    <!-- portrait, nom touchable pour renommer, stade -->
    <section class="ui-card portrait">
      <div class="photo" :class="{ live: portrait.live.value }" :style="look.color ? { '--av': look.color } : null">
        <img :src="portrait.src.value" alt="" width="96" height="96">
      </div>
      <div class="who">
        <form v-if="editing" class="rename" @submit.prevent="saveName">
          <input ref="input" v-model="draft" maxlength="16" aria-label="Nouveau nom" @keydown.esc="editing = false">
          <button class="ui-btn ui-btn--primary ok" type="submit" aria-label="Valider"><Icon name="solar:check-circle-bold" class="ic" /></button>
        </form>
        <button v-else class="name" aria-label="Renommer" @click="startEdit">
          {{ store.name || "..." }}
          <Icon name="solar:pen-bold" class="pen" />
        </button>
        <span class="stage">{{ stage.label }}</span>
        <span class="ui-tag mood" :style="{ '--c': moodInfo[1] }">{{ moodInfo[0] }}</span>
      </div>
    </section>

    <!-- son apparence, tirée à l'éclosion (lib/appearance.js), et les chances, en toute franchise -->
    <section v-if="store.appearance" class="ui-card look">
      <div class="look-row">
        <span class="swatch" :style="{ background: lookText.swatch }" aria-hidden="true" />
        <div class="look-main">
          <strong class="look-name">{{ lookText.label }}</strong>
          <span class="look-sub">{{ lookText.shape }}</span>
        </div>
        <span class="ui-tag" :style="{ '--c': lookText.rarityColor }">
          <Icon v-if="look.rarity !== 'commune'" name="solar:stars-bold-duotone" class="ic" />{{ lookText.rarityLabel }}
        </span>
      </div>
      <details class="how">
        <summary>Chaque œuf est unique</summary>
        <p class="odds-intro">Sa couleur et sa forme sont tirées au hasard à l'éclosion, et elle les garde toute sa vie. Les chances :</p>
        <ul class="odds">
          <li v-for="r in oddsRows" :key="r.key"><span>{{ r.label }}</span><strong>{{ r.odds }}</strong></li>
        </ul>
        <p class="odds-intro">Couleurs rares, oreilles et motifs (bicolore, taches, brillant) rendent une créature plus rare. Toutes sont aussi adorables !</p>
      </details>
    </section>

    <p v-if="sulking" class="ui-note ui-note--violet">Elle boude en ce moment. Jouer avec elle l'apaise.</p>
    <p v-if="store.illness" class="ui-note ui-note--accent">Elle est malade. Un soin et un peu de repos la remettront sur pattes.</p>
    <p v-else-if="store.exhausted" class="ui-note ui-note--violet">Elle est à bout de forces. Un bon dodo lui fera du bien.</p>

    <!-- raccourcis : ses journées, l'album, ses jeux (hors de la barre du bas) -->
    <nav v-if="shortcuts.length" class="shortcuts" aria-label="Plus">
      <button v-for="c in shortcuts" :key="c.key" class="ui-tile short" @click="c.run">
        <Icon :name="c.icon" class="short-ic" />
        <span class="ui-tile-label">{{ c.label }}</span>
        <span v-if="c.badge" class="ui-dot" aria-hidden="true" />
      </button>
    </nav>

    <!-- carnet « Ce qu'elle aime » : ses goûts découverts en jouant -->
    <TastesCard />

    <!-- croissance -->
    <section class="ui-card">
      <h3 class="ui-section-title"><Icon name="solar:leaf-bold-duotone" class="ic" />Croissance</h3>
      <template v-if="stage.next">
        <div class="ui-bar"><i :style="{ width: Math.round((stage.progress || 0) * 100) + '%' }" /></div>
        <p class="ui-text small">Prochain stade : <strong>{{ stage.nextLabel }}</strong>. {{ stage.hint }}</p>
      </template>
      <p v-else class="ui-text">Elle a fini de grandir. Plein d'aventures vous attendent encore !</p>
    </section>

    <!-- caractère -->
    <section class="ui-card">
      <h3 class="ui-section-title"><Icon name="solar:magic-stick-3-bold-duotone" class="ic" />Caractère</h3>
      <ul class="bars traits">
        <li v-for="t in traitRows" :key="t.key">
          <span class="bar-label">{{ t.label }}</span>
          <div class="ui-bar ui-bar--thin"><i :style="{ width: Math.round(t.value * 100) + '%', background: t.color }" /></div>
          <span class="bar-value">{{ Math.round(t.value * 100) }}</span>
        </li>
      </ul>
      <details class="how">
        <summary>Comment se forme son caractère</summary>
        <ul>
          <li v-for="t in traitRows" :key="t.key"><strong>{{ t.label }}</strong> : {{ t.hint }}</li>
          <li>Les habitudes s'estompent doucement si tu changes ta façon de t'en occuper.</li>
        </ul>
      </details>
    </section>

    <!-- santé (déjà visible en jauges sur l'écran principal : en dernier) -->
    <section class="ui-card">
      <h3 class="ui-section-title"><Icon name="solar:heart-pulse-bold-duotone" class="ic" />Santé et forme</h3>
      <ul class="bars">
        <li v-for="s in statRows" :key="s.key">
          <Icon :name="s.icon" class="bar-icon" :style="{ color: s.color }" />
          <span class="bar-label">{{ s.label }}</span>
          <div class="ui-bar ui-bar--thin"><i :style="{ width: s.width + '%', background: s.color }" /></div>
          <span class="bar-value">{{ Math.round(s.value) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { STATS, TRAIT_INFO } from "~/lib/gameUi";
import { MOOD_LABELS } from "~/lib/creatureLook";
import { appearanceText, oddsText, RARITY_INFO, RARITY_ODDS, ORIGINAL_APPEARANCE } from "~/lib/appearance";

const { store, sulking, mood } = useCreatureMood();
const stage = computed(() => store.stageInfo || { label: "", next: null });
const portrait = useCreaturePortrait();
const look = computed(() => store.appearance || ORIGINAL_APPEARANCE);
const lookText = computed(() => appearanceText(look.value));
const oddsRows = Object.entries(RARITY_ODDS).map(([key, p]) => ({ key, label: RARITY_INFO[key].label, odds: oddsText(p) }));
const moodInfo = computed(() => MOOD_LABELS[mood.value] || ["", "#4fc3a1"]);
const statRows = computed(() => STATS.map((s) => ({ ...s, value: store[s.key], width: Math.min(store[s.key], 100) })));
const traitRows = computed(() =>
  Object.entries(TRAIT_INFO).map(([key, info]) => ({ key, ...info, value: store.traits[key] || 0 }))
);

const pages = computed(() => store.unlockedPages || []);
const questReady = computed(() =>
  (store.features?.defis && (store.quests?.list || []).some((q) => q.progress >= q.target && !q.claimed))
  || store.pendingBonus > 0 || !!store.questBonusReady);
const shortcuts = computed(() => [
  pages.value.includes("jours") && { key: "jours", label: "Jours", icon: "solar:calendar-bold-duotone", badge: questReady.value, run: () => openPage("jours") },
  pages.value.includes("album") && { key: "album", label: "Album", icon: "solar:gallery-bold-duotone", badge: store.unlocked.length > gameBus.seenUnlocked, run: () => openPage("album") },
  store.features?.ballon && { key: "activites", label: "Jeux", icon: "solar:cup-star-bold-duotone", badge: false, run: () => openSheet("activites") },
].filter(Boolean));

const editing = ref(false);
const draft = ref("");
const input = ref(null);
async function startEdit() {
  draft.value = store.name || "";
  editing.value = true;
  await nextTick();
  input.value?.focus();
  input.value?.select();
}
function saveName() {
  store.rename(draft.value);
  editing.value = false;
}
</script>

<style scoped>
.portrait { display: flex; align-items: center; gap: var(--s-4); }
.photo {
  flex: none;
  width: 88px;
  height: 88px;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: linear-gradient(180deg, #ffe7c2, #ffc98a);
  box-shadow: 0 0 0 4px #fff, 0 6px 14px rgba(40, 55, 80, 0.2);
}
.photo img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.12) translateY(4%); }
.photo.live { background: linear-gradient(180deg, color-mix(in srgb, var(--av, #ffc98a) 18%, #fff), color-mix(in srgb, var(--av, #ffc98a) 42%, #fff)); }
.photo.live img { transform: none; }
.look-row { display: flex; align-items: center; gap: var(--s-3); }
.swatch { flex: none; width: 40px; height: 40px; border-radius: 50%; box-shadow: 0 0 0 3px #fff, var(--sh-1); }
.look-main { display: grid; gap: 2px; min-width: 0; flex: 1; }
.look-name { font: 700 var(--t-lg) / 1.15 var(--font-title); color: var(--ink); }
.look-sub { font: 700 var(--t-sm) / 1.3 var(--font-text); color: var(--ink-3); }
.look .ui-tag { flex: none; }
.odds-intro { margin: var(--s-2) 0 0; font-weight: 700; }
.odds { list-style: none; padding: 0 !important; }
.odds li { display: flex; justify-content: space-between; gap: var(--s-2); padding: 2px 0; }
.odds strong { font-family: var(--font-title); font-variant-numeric: tabular-nums; color: var(--ink); }
.who { display: grid; gap: 4px; justify-items: start; min-width: 0; flex: 1; }
.name {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  max-width: 100%;
  min-height: var(--tap);
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: 700 26px/1.1 var(--font-title);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pen { flex: none; width: 20px; height: 20px; color: var(--ink-3); }
.rename { display: flex; gap: 6px; width: 100%; }
.rename input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  box-shadow: inset 0 2px 4px rgba(40, 55, 80, 0.1), 0 0 0 3px var(--accent-hi);
  font: 700 20px var(--font-title);
  color: var(--ink);
  outline: none;
}
.ok { width: 48px; padding: 0; }
.stage { font: 800 var(--t-md) var(--font-text); color: var(--ink-2); }
.mood { font-size: 13px; padding: 4px 12px; }
.small { margin-top: 10px; font-size: var(--t-md); }

/* raccourcis : mêmes tuiles que la grille d'actions */
.shortcuts { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 10px; }
.short { min-height: 72px; justify-content: center; }
.short-ic { width: 30px; height: 30px; color: var(--accent); }
.short .ui-tile-label { font-size: 13px; }
.short .ui-dot { right: calc(50% - 26px); }

.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.bars li { display: grid; grid-template-columns: 24px minmax(0, 84px) 1fr 30px; align-items: center; gap: var(--s-2); }
.traits li { grid-template-columns: minmax(0, 96px) 1fr 30px; }
.bar-icon { width: 24px; height: 24px; }
.bar-label { font: 800 var(--t-md) var(--font-text); color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-value { text-align: right; font: 700 var(--t-md) var(--font-title); font-variant-numeric: tabular-nums; color: var(--ink-2); }
.how { margin-top: var(--s-3); font: 700 var(--t-md)/1.4 var(--font-text); color: var(--ink-2); }
.how summary { display: flex; align-items: center; min-height: var(--tap); cursor: pointer; font-weight: 800; color: var(--accent-ink); }
.how ul { margin: var(--s-1) 0 0; padding-left: 18px; display: grid; gap: 4px; }
</style>
