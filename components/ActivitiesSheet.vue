<template>
  <div class="ui-stack acts">
    <p class="ui-text">Ses jeux, ses records. Tu peux aussi toucher les objets posés dans le pré.</p>
    <article
      v-for="c in cards"
      :key="c.id"
      class="ui-row card"
      :class="{ ready: c.state === 'ready', soon: c.state === 'soon', 'is-love': c.fav }"
    >
      <span class="ui-thumb ui-thumb--lg" :class="{ 'ui-thumb--accent': c.state !== 'soon' }"><Icon :name="c.icon" class="ic" /></span>
      <div class="ui-row-main">
        <h3 class="ui-row-title">
          {{ c.label }}
          <span v-if="c.fav" class="ui-tag ui-tag--love"><Icon name="solar:heart-bold-duotone" class="ic" />Sa préférée</span>
          <span v-if="c.state === 'soon'" class="ui-tag">Bientôt</span>
        </h3>
        <p class="ui-caption">{{ c.desc }}</p>
        <p v-if="c.best > 0" class="ui-row-sub best"><Icon name="solar:cup-star-bold-duotone" class="ic" />Record : {{ c.best }} {{ c.unit }}</p>
        <p v-for="m in c.mastery" :key="m.id" class="ui-row-sub mastery" :class="{ done: m.done }">
          <Icon name="solar:star-bold-duotone" class="ic" />{{ m.label }} · {{ m.done ? "réussi" : `${m.gems} Étoiles` }}
        </p>
        <p v-if="c.state !== 'ready' && c.state !== 'soon' && c.state !== 'locked' && c.reason" class="ui-row-sub why">{{ c.reason }}</p>
      </div>
      <button v-if="c.state === 'ready' || c.state === 'tired'" class="ui-btn ui-btn--primary play" :aria-label="`Jouer : ${c.label}`" :disabled="c.state !== 'ready'" @click="emit('launch', c.id)">
        <Icon name="solar:play-bold" class="ic" />
      </button>
      <button v-else-if="c.state === 'prop' && c.prop && store.features?.boutique" class="ui-btn ui-btn--gold play" :aria-label="`Trouver ${c.reason} à la boutique`" @click="navigate({ to: 'boutique', tab: 'objets', focus: c.prop })">
        <Icon name="solar:shop-bold-duotone" class="ic" />
      </button>
    </article>
  </div>
</template>

<script setup>
// Carte secondaire des activités : records, maîtrises, cartes « bientôt ».
// Usage (intégrateur) : <ActivitiesSheet @launch="(id) => (playing = id)" /> dans un BaseSheet.
import { computed } from "vue";
import { ACTIVITIES, MASTERY, propById } from "~/lib/catalog";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { useInventoryStore } from "~/stores/useInventoryStore";

const emit = defineEmits(["launch"]);
const store = useTamagotchiStore();
const inventory = useInventoryStore();
const RANK = { ready: 0, tired: 1, prop: 2, locked: 3, soon: 4 };

const cards = computed(() => {
  void store.tick; void store.energy; void store.isSleeping;
  const seen = inventory.stats?.tastesSeen || [];
  const favActivity = seen.includes("activity") ? store.tastes?.activity : null;
  const list = ACTIVITIES.map((a) => {
    const can = store.canActivity(a.id);
    let state = "ready";
    let reason = "";
    if (a.soon) state = "soon";
    else if (can.locked) state = "locked";
    else if (can.needProp) { state = "prop"; reason = `Il te manque : ${propById(can.needProp)?.label || "un objet"}.`; }
    else if (!can.ok) { state = "tired"; reason = can.reason; }
    const mastered = inventory.stats?.mastery || [];
    return {
      id: a.id,
      label: a.label,
      icon: a.icon,
      desc: a.desc,
      unit: a.scoreUnit,
      best: a.noScore ? 0 : inventory.stats?.best?.[a.id] || 0,
      fav: favActivity === a.id,
      state,
      reason,
      prop: can.needProp || "",
      // les défis de maîtrise parlent d'Étoiles : seulement une fois les Étoiles découvertes
      mastery: a.soon || !store.features?.etoiles ? [] : MASTERY.filter((m) => m.kind === "score" && m.activity === a.id).map((m) => ({ ...m, done: mastered.includes(m.id) })),
    };
  }).sort((x, y) => RANK[x.state] - RANK[y.state]);
  // une activité pas encore découverte reste une surprise (aucune carte « secret ») ;
  // les cartes « bientôt » n'apparaissent qu'une fois toutes les activités découvertes
  const hidden = list.some((c) => c.state === "locked");
  return list.filter((c) => c.state !== "locked" && (c.state !== "soon" || !hidden));
});
</script>

<style scoped>
.acts { padding-bottom: var(--s-2); }
.card { align-items: center; padding: var(--s-3); }
.card.ready:not(.is-love) { box-shadow: inset 0 0 0 2px #cdeebb, 0 4px 10px rgba(40, 55, 80, 0.08); }
.card.soon { opacity: 0.7; }
.card.soon .ui-thumb { filter: grayscale(0.8); }
.ui-row-main > p { margin: 0; }
.ui-row-main { gap: 3px; }
.best { color: #c27f00; font-weight: 800; }
.mastery { color: var(--ink-3); }
.mastery.done { color: var(--gem-ink); }
.why { color: var(--warn-ink); font-weight: 800; }
.play { width: 48px; padding: 0; border-radius: 50%; }
.play .ic { width: 24px; height: 24px; }
</style>
