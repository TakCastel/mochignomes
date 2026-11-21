<template>
  <div class="acts">
    <p class="intro">Ses jeux, ses records. Tu peux aussi toucher les objets posés dans le pré.</p>
    <article
      v-for="c in cards"
      :key="c.id"
      class="card"
      :class="{ ready: c.state === 'ready', soon: c.state === 'soon', locked: c.state === 'locked', fav: c.fav }"
    >
      <span class="ic-wrap"><Icon :name="c.icon" class="ic" /></span>
      <div class="txt">
        <h3>
          {{ c.label }}
          <span v-if="c.fav" class="tag love"><Icon name="solar:heart-bold-duotone" class="tag-ic" />Sa préférée</span>
          <span v-if="c.state === 'soon'" class="tag">Bientôt</span>
        </h3>
        <p class="desc">{{ c.state === "locked" ? "Encore un secret... continue de t'occuper d'elle." : c.desc }}</p>
        <p v-if="c.best > 0" class="best"><Icon name="solar:cup-star-bold-duotone" class="best-ic" />Record : {{ c.best }} {{ c.unit }}</p>
        <p v-for="m in c.mastery" :key="m.id" class="mastery" :class="{ done: m.done }">
          <Icon name="solar:star-bold-duotone" class="m-ic" />{{ m.label }} · {{ m.done ? "réussi" : `${m.gems} Étoiles` }}
        </p>
        <p v-if="c.state !== 'ready' && c.state !== 'soon' && c.state !== 'locked' && c.reason" class="why">{{ c.reason }}</p>
      </div>
      <button v-if="c.state === 'ready' || c.state === 'tired'" class="play" :disabled="c.state !== 'ready'" @click="emit('launch', c.id)">
        <Icon name="solar:play-bold" class="play-ic" />
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
  return ACTIVITIES.map((a) => {
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
      mastery: a.soon ? [] : MASTERY.filter((m) => m.kind === "score" && m.activity === a.id).map((m) => ({ ...m, done: mastered.includes(m.id) })),
    };
  }).sort((x, y) => RANK[x.state] - RANK[y.state]);
});
</script>

<style scoped>
.acts { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }
.intro { margin: 0 2px 4px; font-weight: 700; font-size: 14px; color: #6a7585; }
.card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 20px;
  background: linear-gradient(180deg, #ffffff, #f4f6f9);
  border: 2px solid transparent;
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.08), inset 0 1px 0 #fff;
}
.card.ready { border-color: #bfeaa8; }
.card.fav { border-color: #ffb3c9; background: linear-gradient(180deg, #fff8fb, #ffeef4); }
.card.soon, .card.locked { opacity: 0.7; }
.ic-wrap {
  flex: none; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px;
  background: linear-gradient(180deg, #f3fdec, #e2f7d4);
}
.soon .ic-wrap, .locked .ic-wrap { background: #eef1f5; filter: grayscale(0.8); }
.ic { width: 34px; height: 34px; color: #3faa2e; }
.txt { flex: 1; min-width: 0; }
h3 { margin: 0; font-size: 16px; font-weight: 900; color: #2b3440; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.tag { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; background: #eef1f5; color: #6a7585; font-size: 11px; font-weight: 900; }
.tag.love { background: #ffe3ec; color: #e0477f; }
.tag-ic { width: 13px; height: 13px; }
.desc { margin: 3px 0 0; font-size: 13px; font-weight: 600; color: #6a7585; line-height: 1.3; }
.best { margin: 5px 0 0; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 900; color: #d08a00; }
.best-ic, .m-ic { width: 16px; height: 16px; }
.mastery { margin: 3px 0 0; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800; color: #9aa3b0; }
.mastery.done { color: #8a4dff; }
.why { margin: 4px 0 0; font-size: 12px; font-weight: 800; color: #e07a2a; }
.play {
  flex: none; width: 48px; height: 48px; border: 0; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(180deg, #6fd14c, #43b02a); box-shadow: 0 4px 0 #2f8f22;
  cursor: pointer;
}
.play:active { transform: translateY(2px); box-shadow: 0 2px 0 #2f8f22; }
.play:disabled { background: #d9dee5; box-shadow: 0 4px 0 #c3cad3; cursor: default; }
.play-ic { width: 24px; height: 24px; color: #fff; }
</style>
