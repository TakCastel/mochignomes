<template>
  <Transition name="msheet">
    <div v-if="open" class="m-overlay" @click.self="close">
      <section class="m-sheet" role="dialog" aria-modal="true" aria-label="Manger">
        <div class="grab" />
        <header class="head">
          <span class="badge"><Icon name="solar:donut-bitten-bold-duotone" class="badge-ic" /></span>
          <div class="title">
            <h2>Manger</h2>
            <p class="subtitle">{{ subtitle }}</p>
          </div>
          <button class="round" aria-label="Fermer" @click="close">
            <Icon name="solar:close-circle-bold" class="round-ic" />
          </button>
        </header>

        <div class="body">
          <!-- goûter gratuit (l'action « nourrir » d'origine) -->
          <button class="row snack" :class="{ off: !!snackReason, wiggle: wiggling === 'snack' }" @click="snack">
            <span class="dish" style="--d1: #ffe9c8; --d2: #e8781c">
              <Icon name="solar:donut-bitten-bold-duotone" class="dish-ic" />
            </span>
            <span class="row-main">
              <span class="row-name">Petit goûter</span>
              <span class="row-sub">{{ snackReason || "Gratuit · calme un petit creux" }}</span>
            </span>
            <span class="pill free">Gratuit</span>
          </button>

          <!-- plats du frigo -->
          <p class="section"><Icon name="solar:fridge-bold-duotone" class="section-ic" />Au frigo</p>
          <button
            v-for="m in meals"
            :key="m.r.id"
            class="row"
            :class="{ wanted: m.wanted, off: !!mealReason, wiggle: wiggling === m.r.id }"
            @click="serve(m)"
          >
            <span class="dish" :style="{ '--d1': m.tint[0], '--d2': m.tint[1] }">
              <Icon :name="m.r.icon" class="dish-ic" />
              <span class="qty">×{{ m.qty }}</span>
            </span>
            <span class="row-main">
              <span class="row-name">
                {{ m.r.label }}
                <span v-if="m.best" class="stars-mini">
                  <Icon v-for="i in 3" :key="i" name="solar:star-bold" class="st" :class="{ on: i <= m.best }" />
                </span>
              </span>
              <span v-if="m.wanted" class="row-sub love"><Icon name="solar:chat-round-dots-bold-duotone" class="tiny" />Elle en a envie !</span>
              <span v-else-if="m.love" class="row-sub love"><Icon name="solar:heart-bold-duotone" class="tiny" />Son plat préféré</span>
              <span v-else class="row-sub">Un vrai repas · rend de l'énergie</span>
            </span>
            <span class="pill energy"><Icon name="solar:bolt-bold-duotone" class="tiny" />+{{ m.energy }}</span>
          </button>
          <p v-if="!meals.length" class="empty">Le frigo est vide. Un bon petit plat lui rendrait de l'énergie !</p>
          <p v-else-if="mealReason" class="empty">{{ mealReason }}</p>

          <!-- vers la cuisine -->
          <button v-if="canCook" class="row cook" @click="cook">
            <span class="dish" style="--d1: #e7f8dc; --d2: #3c9a22">
              <Icon name="solar:chef-hat-bold-duotone" class="dish-ic" />
            </span>
            <span class="row-main">
              <span class="row-name">Cuisiner</span>
              <span class="row-sub">{{ readyCount ? `${readyCount} recette${readyCount > 1 ? "s" : ""} possible${readyCount > 1 ? "s" : ""}` : "Préparer un bon plat" }}</span>
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
  background: linear-gradient(180deg, rgba(40, 20, 60, 0) 30%, rgba(40, 20, 60, 0.22));
}
.m-sheet {
  display: flex; flex-direction: column; width: 100%; max-width: 480px; max-height: 62vh; max-height: 62dvh;
  background: linear-gradient(180deg, #ffffff 60%, var(--plate-hi, #fff)); color: var(--ink);
  border-radius: 32px 32px 0 0; padding: 10px 16px calc(env(safe-area-inset-bottom, 0px) + 14px);
  box-shadow: 0 -10px 40px rgba(30, 15, 50, 0.28), inset 0 2px 0 #fff;
}
.grab { flex: none; width: 44px; height: 5px; border-radius: 999px; background: var(--knob-side, #dde3ea); margin: 0 auto 10px; }
.head { flex: none; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.badge {
  flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, var(--accent-hi), var(--accent) 70%);
  box-shadow: 0 4px 0 var(--accent-lo), inset 0 2px 0 rgba(255, 255, 255, 0.4);
}
.badge-ic { width: 24px; height: 24px; color: #fff; }
.title { flex: 1; min-width: 0; }
h2 { margin: 0; font: 700 22px/1.1 "Fredoka", "Nunito", system-ui, sans-serif; }
.subtitle { margin: 2px 0 0; font: 700 13px "Nunito", system-ui, sans-serif; color: color-mix(in srgb, var(--ink) 65%, #fff); }
.round {
  flex: none; display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 50%;
  background: #fff; color: var(--ink); cursor: pointer; box-shadow: 0 4px 12px rgba(40, 55, 80, 0.14);
}
.round-ic { width: 22px; height: 22px; }
.body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; gap: 8px; padding: 2px 2px 6px; }
.section { display: flex; align-items: center; gap: 5px; margin: 6px 0 0; font: 800 12px "Nunito", sans-serif; color: #7d8794; text-transform: uppercase; letter-spacing: 0.04em; }
.section-ic { width: 16px; height: 16px; }
.row {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; text-align: left;
  border: 2px solid transparent; border-radius: 20px; cursor: pointer; color: var(--ink);
  background: linear-gradient(180deg, #ffffff, #f4f6f9);
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), inset 0 1px 0 #fff;
  -webkit-tap-highlight-color: transparent; transition: transform 0.08s;
}
.row:active { transform: scale(0.97); }
.row.off { opacity: 0.6; }
.row.wanted { border-color: #ff9dbb; background: linear-gradient(180deg, #fff8fa, #ffeef3); }
.row.cook { border-color: #bfe9a8; background: linear-gradient(180deg, #f6fdf1, #e7f8dc); margin-top: 4px; }
.dish {
  position: relative; flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 16px;
  background: radial-gradient(circle at 35% 30%, #fff, var(--d1) 60%);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--d2) 30%, transparent);
}
.dish-ic { width: 28px; height: 28px; color: var(--d2); }
.qty { position: absolute; right: -6px; bottom: -6px; padding: 1px 6px; border-radius: 999px; background: #fff; font: 800 11px "Fredoka", sans-serif; color: var(--ink); box-shadow: 0 1px 4px rgba(40, 55, 80, 0.2); }
.row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-name { display: flex; align-items: center; gap: 6px; font: 700 16px "Fredoka", "Nunito", sans-serif; }
.row-sub { display: inline-flex; align-items: center; gap: 3px; font: 700 12px "Nunito", sans-serif; color: #7d8794; }
.row-sub.love { color: #e2457a; }
.tiny { width: 14px; height: 14px; }
.stars-mini { display: inline-flex; gap: 1px; }
.st { width: 12px; height: 12px; color: #dfe4ea; }
.st.on { color: #ffc21a; }
.pill { flex: none; display: inline-flex; align-items: center; gap: 2px; padding: 4px 9px; border-radius: 999px; font: 800 13px "Fredoka", "Nunito", sans-serif; }
.pill.free { background: #eefbe7; color: #2f8a22; }
.pill.energy { background: #efeaff; color: #5b3fd0; }
.go { width: 22px; height: 22px; color: var(--accent-lo); }
.empty { margin: 2px 4px; font: 700 13px "Nunito", sans-serif; color: #7d8794; text-align: center; }
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
