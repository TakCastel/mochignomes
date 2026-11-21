<template>
  <Transition name="msheet">
    <div v-if="open" class="m-overlay" @click.self="close">
      <section class="ui-half-sheet m-sheet" role="dialog" aria-modal="true" aria-label="Manger">
        <div class="ui-grab" />
        <header class="ui-sheet-head">
          <span class="ui-medal ui-medal--sm"><Icon name="solar:donut-bitten-bold-duotone" class="ic" /></span>
          <div class="ui-sheet-title">
            <h2>Manger</h2>
            <p>{{ subtitle }}</p>
          </div>
          <button class="ui-icon-btn" aria-label="Fermer" @click="close">
            <Icon name="solar:close-circle-bold" class="ic" />
          </button>
        </header>

        <div class="body">
          <!-- goûter gratuit (l'action « nourrir » d'origine) -->
          <button class="ui-row" :class="{ off: !!snackReason, wiggle: wiggling === 'snack' }" @click="snack">
            <span class="ui-thumb dish" style="--d1: #ffe9c8; --d2: #e8781c">
              <Icon name="solar:donut-bitten-bold-duotone" class="ic" />
            </span>
            <span class="ui-row-main">
              <span class="ui-row-title">Petit goûter</span>
              <span class="ui-row-sub">{{ snackReason || "Calme un petit creux" }}</span>
            </span>
            <span class="ui-tag ui-tag--accent pill">Gratuit</span>
          </button>

          <!-- plats du frigo -->
          <p class="ui-overline"><Icon name="solar:fridge-bold-duotone" class="ic" />Au frigo</p>
          <button
            v-for="m in meals"
            :key="m.r.id"
            class="ui-row"
            :class="{ 'is-love': m.wanted, off: !!mealReason, wiggle: wiggling === m.r.id }"
            @click="serve(m)"
          >
            <span class="ui-thumb dish" :style="{ '--d1': m.tint[0], '--d2': m.tint[1] }">
              <Icon :name="m.r.icon" class="ic" />
              <span class="qty">×{{ m.qty }}</span>
            </span>
            <span class="ui-row-main">
              <span class="ui-row-title">
                {{ m.r.label }}
                <span v-if="m.best" class="ui-stars">
                  <Icon v-for="i in 3" :key="i" name="solar:star-bold" class="ic" :class="{ on: i <= m.best }" />
                </span>
              </span>
              <span v-if="m.wanted" class="ui-row-sub love"><Icon name="solar:chat-round-dots-bold-duotone" class="ic" />Elle en a envie !</span>
              <span v-else-if="m.love" class="ui-row-sub love"><Icon name="solar:heart-bold-duotone" class="ic" />Son plat préféré</span>
              <span v-else class="ui-row-sub">Un vrai repas · rend de l'énergie</span>
            </span>
            <span class="ui-tag ui-tag--violet pill"><Icon name="solar:bolt-bold-duotone" class="ic" />+{{ m.energy }}</span>
          </button>
          <div v-if="!meals.length" class="ui-empty"><p>Le frigo est vide. Un bon petit plat lui rendrait de l'énergie !</p></div>
          <p v-else-if="mealReason" class="ui-foot-note">{{ mealReason }}</p>

          <!-- vers la cuisine -->
          <button v-if="canCook" class="ui-row is-on cook" @click="cook">
            <span class="ui-thumb ui-thumb--accent"><Icon name="solar:chef-hat-bold-duotone" class="ic" /></span>
            <span class="ui-row-main">
              <span class="ui-row-title">Cuisiner</span>
              <span class="ui-row-sub">{{ readyCount ? `${readyCount} recette${readyCount > 1 ? "s" : ""} possible${readyCount > 1 ? "s" : ""}` : "Préparer un bon plat" }}</span>
            </span>
            <Icon name="solar:arrow-right-bold" class="go" />
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
// Petite feuille du bouton « Manger » : goûter gratuit (action « nourrir » d'origine, plus faible),
// plats prêts du frigo (un vrai repas rend de l'énergie), et l'entrée « Cuisiner » (émet "cook").
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { V1_RECIPES, missingIngredients, starMult } from "~/lib/catalog";
import { useCreatureMood, gameCommand, gameSay } from "~/composables/useCreatureMood";
import { beep, haptic } from "~/composables/useBeep";

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(["close", "cook"]);

const { store } = useCreatureMood();
const inv = useInventoryStore();

const TINTS = {
  crepes: ["#ffe9b8", "#f2b544"], "salade-fruits": ["#ffe0e6", "#f2627f"], smoothie: ["#ffd9ec", "#e2559c"],
  omelette: ["#fff3b0", "#f0c419"], croque: ["#ffe7c7", "#d98b3a"], "glace-fraise": ["#ffe1ea", "#ef7aa0"],
  pizza: ["#ffe0cc", "#e8603c"], "tarte-pommes": ["#f1f9d9", "#9bc93c"],
};

const snackReason = computed(() => {
  void store.tick;
  const c = store.canAct?.("nourrir");
  return c && !c.ok ? c.reason || "Encore un instant..." : "";
});
const mealReason = computed(() => {
  void store.tick;
  const first = meals.value[0];
  if (!first) return "";
  const c = store.canEatMeal?.(first.r.id);
  return c && !c.ok ? c.reason : "";
});

const loveSeen = computed(() => { try { return inv.isTasteSeen("food"); } catch { return false; } });
const meals = computed(() =>
  V1_RECIPES.filter((r) => (inv.meals?.[r.id] || 0) > 0).map((r) => {
    const best = inv.recipeStars?.[r.id] || 0;
    return {
      r, best, qty: inv.meals[r.id],
      energy: Math.round((r.effects?.energy || 0) * starMult(best || 1)),
      love: loveSeen.value && store.tastes?.food === r.id,
      wanted: store.wish?.action === "repas" && store.wish?.target === r.id,
      tint: TINTS[r.id] || ["#eaf7e2", "#4fbf34"],
    };
  }).sort((a, b) => Number(b.wanted) - Number(a.wanted) || Number(b.love) - Number(a.love))
);

const canCook = computed(() => (store.hasFeature ? store.hasFeature("cuisine") : !!store.features?.cuisine));
const readyCount = computed(() =>
  V1_RECIPES.filter((r) => (store.level || 1) >= (r.minLevel || 1) && !Object.keys(missingIngredients(r.id, inv.pantry)).length).length
);
const subtitle = computed(() => (meals.value.length ? `${inv.mealsCount} plat${inv.mealsCount > 1 ? "s" : ""} prêt${inv.mealsCount > 1 ? "s" : ""}` : "Un goûter ou un bon repas ?"));

const wiggling = ref(null);
function wiggle(key) {
  wiggling.value = null;
  requestAnimationFrame(() => (wiggling.value = key));
  setTimeout(() => { if (wiggling.value === key) wiggling.value = null; }, 450);
}

function snack() {
  if (snackReason.value) { gameSay(snackReason.value); wiggle("snack"); return; }
  const res = store.applyAction("nourrir");
  if (!res || res.ok === false) { gameSay(res?.reason || "Pas maintenant..."); wiggle("snack"); return; }
  haptic([12, 30, 12]);
  close();
}

function serve(m) {
  const res = inv.serveMeal(m.r.id);
  if (!res?.ok) { gameSay(res?.reason || "Pas maintenant..."); wiggle(m.r.id); return; }
  const mood = res.reaction?.mood;
  if (!mood || mood === "meh") gameCommand("react", "nourrir");
  haptic([12, 30, 12]);
  beep(mood === "love" ? "love" : "fruit");
  close();
}

function cook() {
  beep("tap");
  emit("cook");
}
function close() { emit("close"); }

const onKey = (e) => e.key === "Escape" && props.open && close();
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style scoped>
.m-overlay {
  position: fixed; inset: 0; z-index: 20; display: flex; align-items: flex-end; justify-content: center;
  background: linear-gradient(180deg, rgba(30, 40, 70, 0) 30%, rgba(30, 40, 70, 0.22));
}
.m-sheet { max-height: 62vh; max-height: 62dvh; }
.body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: var(--s-2); padding: 2px 2px 6px; }
.off { opacity: 0.6; }
.dish { background: radial-gradient(circle at 35% 30%, #fff, var(--d1) 65%); }
.dish .ic { color: var(--d2); }
.qty { position: absolute; right: -6px; bottom: -6px; padding: 0 6px; border-radius: var(--r-pill); background: #fff; color: var(--ink); font: 800 var(--t-xs)/18px var(--font-title); box-shadow: var(--sh-1); }
.ui-row-sub.love { color: var(--love-ink); }
.pill { flex: none; font: 700 var(--t-md) var(--font-title); padding: 4px 10px; }
.pill .ic { width: 15px; height: 15px; }
.cook { margin-top: var(--s-1); }
.go { flex: none; width: 22px; height: 22px; color: var(--accent-lo); }
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle { 20% { transform: rotate(-2deg); } 40% { transform: rotate(2deg); } 60% { transform: rotate(-1deg); } 80% { transform: rotate(1deg); } }
.msheet-enter-active, .msheet-leave-active { transition: opacity 0.25s; }
.msheet-enter-active .m-sheet, .msheet-leave-active .m-sheet { transition: transform 0.3s cubic-bezier(0.3, 1.2, 0.5, 1); }
.msheet-enter-from, .msheet-leave-to { opacity: 0; }
.msheet-enter-from .m-sheet, .msheet-leave-to .m-sheet { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) {
  .msheet-enter-active .m-sheet, .msheet-leave-active .m-sheet { transition: none; }
}
</style>
