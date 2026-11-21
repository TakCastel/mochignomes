<template>
  <div class="elle">
    <!-- portrait, nom touchable pour renommer, stade -->
    <section class="card portrait">
      <div class="photo"><img src="/images/avatar.webp" alt="" width="96" height="96"></div>
      <div class="who">
        <form v-if="editing" class="rename" @submit.prevent="saveName">
          <input ref="input" v-model="draft" maxlength="16" aria-label="Nouveau nom" @keydown.esc="editing = false">
          <button class="ok" type="submit" aria-label="Valider"><Icon name="solar:check-circle-bold" class="ok-ic" /></button>
        </form>
        <button v-else class="name" aria-label="Renommer" @click="startEdit">
          {{ store.name || "..." }}
          <Icon name="solar:pen-bold" class="pen" />
        </button>
        <span class="stage">{{ stage.label }}</span>
        <span class="mood" :style="{ '--c': moodInfo[1] }">{{ moodInfo[0] }}</span>
      </div>
    </section>

    <!-- raccourcis : ses journées, l'album, ses jeux (hors de la barre du bas) -->
    <nav v-if="shortcuts.length" class="shortcuts" aria-label="Plus">
      <button v-for="c in shortcuts" :key="c.key" class="short" @click="c.run">
        <Icon :name="c.icon" class="short-ic" />
        <span>{{ c.label }}</span>
        <span v-if="c.badge" class="short-dot" aria-hidden="true" />
      </button>
    </nav>

    <p v-if="sulking" class="note sulk">Elle boude en ce moment. Jouer avec elle l'apaise.</p>
    <p v-if="store.illness" class="note sick">Elle est malade. Un soin et un peu de repos la remettront sur pattes.</p>
    <p v-else-if="store.exhausted" class="note tired">Elle est à bout de forces. Un bon dodo lui fera du bien.</p>

    <!-- croissance -->
    <section class="card">
      <h3>Croissance</h3>
      <template v-if="stage.next">
        <div class="bar"><div class="fill" :style="{ width: Math.round((stage.progress || 0) * 100) + '%' }" /></div>
        <p class="small">Prochain stade : <strong>{{ stage.nextLabel }}</strong>. {{ stage.hint }}</p>
      </template>
      <p v-else class="small">Elle a fini de grandir. Elle compte sur toi pour la suite.</p>
    </section>

    <!-- santé -->
    <section class="card">
      <h3>Santé et forme</h3>
      <ul class="bars">
        <li v-for="s in statRows" :key="s.key">
          <Icon :name="s.icon" class="bar-icon" :style="{ color: s.color }" />
          <span class="bar-label">{{ s.label }}</span>
          <div class="bar thin"><div class="fill" :style="{ width: s.width + '%', background: s.color }" /></div>
          <span class="bar-value">{{ Math.round(s.value) }}</span>
        </li>
      </ul>
    </section>

    <!-- caractère -->
    <section class="card">
      <h3>Caractère</h3>
      <ul class="bars traits">
        <li v-for="t in traitRows" :key="t.key">
          <span class="bar-label">{{ t.label }}</span>
          <div class="bar thin"><div class="fill" :style="{ width: Math.round(t.value * 100) + '%', background: t.color }" /></div>
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

    <!-- carnet « Ce qu'elle aime » : ses goûts découverts en jouant -->
    <TastesCard />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { STATS, TRAIT_INFO } from "~/lib/gameUi";
import { MOOD_LABELS } from "~/lib/creatureLook";

const { store, sulking, mood } = useCreatureMood();
const stage = computed(() => store.stageInfo || { label: "", next: null });
const moodInfo = computed(() => MOOD_LABELS[mood.value] || ["", "#4fc3a1"]);
const statRows = computed(() => STATS.map((s) => ({ ...s, value: store[s.key], width: Math.min(store[s.key], 100) })));
const traitRows = computed(() =>
  Object.entries(TRAIT_INFO).map(([key, info]) => ({ key, ...info, value: store.traits[key] || 0 }))
);

const pages = computed(() => store.unlockedPages || []);
const questReady = computed(() =>
  (store.quests?.list || []).some((q) => q.progress >= q.target && !q.claimed) || store.pendingBonus > 0 || !!store.questBonusReady);
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
.elle { display: grid; gap: 12px; padding-bottom: 8px; }
.card {
  padding: 14px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1);
}
.portrait { display: flex; align-items: center; gap: 14px; }
.photo {
  flex: none;
  width: 96px;
  height: 96px;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe7c2, #ffc98a);
  border: 4px solid #fff;
  box-shadow: 0 4px 12px rgba(40, 55, 80, 0.2);
}
.photo img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.12) translateY(4%); }
.who { display: grid; gap: 4px; justify-items: start; min-width: 0; flex: 1; }
.name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: 700 26px "Fredoka", "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.pen { width: 20px; height: 20px; color: #8a94a3; }
.rename { display: flex; gap: 6px; width: 100%; }
.rename input {
  flex: 1;
  min-width: 0;
  min-height: 48px;
  padding: 0 12px;
  border: 2px solid #cfe9c4;
  border-radius: 14px;
  font: 700 20px "Fredoka", "Nunito", system-ui, sans-serif;
  color: var(--ink);
}
.ok { width: 48px; height: 48px; border: 0; border-radius: 50%; background: #e9fadf; cursor: pointer; }
.ok-ic { width: 28px; height: 28px; color: #3c9a22; }
.stage { font-weight: 800; font-size: 14px; color: #5b6676; }
.mood {
  padding: 3px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 18%, #fff);
  color: color-mix(in srgb, var(--c) 70%, #000);
  font-weight: 800;
  font-size: 13px;
}
.note { margin: 0; padding: 10px 12px; border-radius: 14px; font-weight: 700; font-size: 14px; }
.sulk { background: #efe6ff; color: #5b3aa8; }
.sick { background: #e8f3d8; color: #4a6a1e; }
.tired { background: #e8ecff; color: #4a4f9e; }
h3 { margin: 0 0 10px; font: 600 17px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink); }
.bar { height: 14px; border-radius: 999px; background: #e4e9ef; overflow: hidden; }
.bar.thin { height: 12px; }
.fill { height: 100%; border-radius: 999px; background: linear-gradient(180deg, #7fdc5a, #44b82e); transition: width 0.5s; }
.small { margin: 8px 0 0; font-size: 14px; font-weight: 700; color: #5b6676; }
.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.bars li { display: grid; grid-template-columns: 26px 88px 1fr 34px; align-items: center; gap: 8px; }
.traits li { grid-template-columns: 96px 1fr 34px; }
.bar-icon { width: 24px; height: 24px; }
.bar-label { font-weight: 800; font-size: 14px; }
.bar-value { text-align: right; font-variant-numeric: tabular-nums; font-weight: 800; font-size: 14px; }
.how { margin-top: 12px; font-size: 14px; color: #5b6676; }
.how summary { cursor: pointer; font-weight: 800; min-height: 32px; }
.how ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 4px; }
.shortcuts { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 10px; }
.short {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 64px;
  padding: 8px 4px;
  border: 0;
  border-radius: 18px;
  background: #fff;
  color: #3c9a22;
  font: 800 13px "Nunito", system-ui, sans-serif;
  box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1);
  cursor: pointer;
}
.short span { color: var(--ink); }
.short-ic { width: 28px; height: 28px; }
.short-dot { position: absolute; top: 8px; right: calc(50% - 22px); width: 10px; height: 10px; border-radius: 50%; background: #ff3b3b; box-shadow: 0 0 0 2px #fff; }
</style>
