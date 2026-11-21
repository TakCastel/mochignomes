<template>
  <!-- la maison : plusieurs mochignomes, un seul dans le pré (les autres se reposent au chaud) -->
  <section id="maison" class="ui-card house">
    <div class="ui-section-head">
      <h3 class="ui-section-title"><Icon name="solar:home-smile-bold-duotone" class="ic" />Tes mochignomes</h3>
      <span class="ui-tag">{{ store.roster.length }} / {{ store.slotsOpen }}</span>
    </div>
    <p class="ui-caption intro">Un seul mochignome à la fois dans le pré. Les autres se reposent au chaud : ils vivent tout doucement, sans jamais tomber malades.</p>

    <ul class="slots">
      <li v-for="s in slots" :key="s.key">
        <!-- un mochignome -->
        <div v-if="s.kind === 'creature'" class="ui-row" :class="{ 'is-on': s.c.active }">
          <span class="ui-thumb ui-thumb--lg pic" :style="s.c.look ? { '--av': s.c.look.swatchColor } : null">
            <img v-if="s.c.portrait" :src="s.c.portrait" alt="" width="64" height="64">
            <Icon v-else-if="!s.c.hatched" name="ph:egg-crack-fill" class="ic egg" />
            <span v-else class="dot" :style="{ background: s.c.look?.swatch }" />
          </span>
          <span class="ui-row-main">
            <span class="ui-row-title">{{ s.c.name }}</span>
            <span class="ui-row-sub">
              <template v-if="s.c.hatched">{{ s.c.stageLabel }} · niv. {{ s.c.level }}</template>
              <template v-else>Un œuf à faire éclore</template>
            </span>
            <span v-if="s.c.look" class="tags">
              <span class="ui-tag" :style="{ '--c': s.c.look.rarityColor }">
                <Icon v-if="s.c.look.rarity !== 'commune'" name="solar:stars-bold-duotone" class="ic" />{{ s.c.look.rarityLabel }}
              </span>
            </span>
          </span>
          <span v-if="s.c.active" class="ui-tag ui-tag--accent here"><Icon name="solar:leaf-bold-duotone" class="ic" />Dans le pré</span>
          <button v-else class="ui-btn ui-btn--primary ui-btn--sm" :disabled="busy" @click="bring(s.c)">
            Faire venir
          </button>
        </div>

        <!-- place libre -->
        <div v-else-if="s.kind === 'free'" class="ui-row is-well free">
          <span class="ui-thumb ui-thumb--lg"><Icon name="ph:egg-fill" class="ic egg" /></span>
          <span class="ui-row-main">
            <span class="ui-row-title">Une place libre</span>
            <span class="ui-row-sub">Un nid tout chaud attend un nouveau mochignome.</span>
          </span>
          <button class="ui-btn ui-btn--gold ui-btn--sm" :disabled="busy || !store.canAdopt" @click="adopt">Adopter un œuf</button>
        </div>

        <!-- place à venir : on l'ouvre en jouant, jamais en payant -->
        <div v-else class="ui-row is-well locked">
          <span class="ui-thumb ui-thumb--lg"><Icon name="solar:lock-keyhole-bold" class="ic lock" /></span>
          <span class="ui-row-main">
            <span class="ui-row-title">Place à venir</span>
            <span class="ui-row-sub">{{ s.hint }}</span>
          </span>
        </div>
      </li>
    </ul>
    <p v-if="busy" class="ui-caption">Pas pendant une activité : finissez la partie d'abord.</p>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { appearanceText } from "~/lib/appearance";
import { stageDef } from "~/lib/growth";
import { useTamagotchiStore, MAX_SLOTS, SLOT_RULES } from "~/stores/useTamagotchiStore";
import { activeActivity } from "~/composables/useLiveCreature";


const store = useTamagotchiStore();
const busy = computed(() => !!gameBus.activity || !!activeActivity.value || houseFx.swapping);

const slots = computed(() => {
  const out = [];
  const list = store.house || [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const c = list[i];
    if (c) {
      const look = c.appearance ? appearanceText(c.appearance) : null;
      if (look) look.swatchColor = c.appearance.color;
      out.push({ key: c.id, kind: "creature", c: { ...c, look, stageLabel: stageDef(c.stage).label } });
    } else if (i < store.slotsOpen) {
      out.push({ key: `free-${i}`, kind: "free" });
    } else {
      const r = SLOT_RULES[i];
      out.push({ key: `lock-${i}`, kind: "locked", hint: `S'ouvre au niveau ${r.level} d'un de tes mochignomes, ou après ${r.days} jours de jeu.` });
    }
  }
  // les créatures en trop (jamais en principe) restent visibles
  for (const c of list.slice(MAX_SLOTS)) out.push({ key: c.id, kind: "creature", c: { ...c, look: null, stageLabel: stageDef(c.stage).label } });
  return out;
});

function bring(c) { bringCreature(c.id); }
function adopt() { adoptEgg(); }
</script>

<style scoped>
.house { display: grid; gap: var(--s-2); }
.house .ui-section-head { margin-bottom: 0; }
.intro { margin: 0; }
.slots { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s-2); }
.pic { overflow: hidden; background: linear-gradient(180deg, color-mix(in srgb, var(--av, #ffc98a) 18%, var(--surface)), color-mix(in srgb, var(--av, #ffc98a) 42%, var(--surface))); }
.pic img { width: 100%; height: 100%; object-fit: cover; }
.dot { width: 34px; height: 34px; border-radius: 50%; box-shadow: 0 0 0 3px var(--surface), var(--sh-1); }
.ic.egg { color: #f0b46a; }
.ic.lock { color: var(--ink-4); }
.tags { display: flex; gap: 4px; margin-top: 2px; }
.here { flex: none; }
.ui-row .ui-btn { flex: none; }
.locked .ui-row-title { color: var(--ink-3); }
.free { outline: 2px dashed color-mix(in srgb, var(--accent) 45%, transparent); outline-offset: -2px; }
</style>
