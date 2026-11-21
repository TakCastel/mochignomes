<template>
  <Transition name="ksheet">
    <div v-if="open" class="k-overlay" @click.self="onBackdrop">
      <section class="k-sheet" role="dialog" aria-modal="true" aria-label="Cuisine">
        <div class="grab" />
        <header class="head">
          <button v-if="phase !== 'list'" class="round" aria-label="Retour aux recettes" @click="backToList">
            <Icon name="solar:arrow-left-bold" class="round-ic" />
          </button>
          <span v-else class="badge"><Icon name="solar:chef-hat-bold-duotone" class="badge-ic" /></span>
          <div class="title">
            <h2>{{ headTitle }}</h2>
            <p class="subtitle">{{ headSub }}</p>
          </div>
          <span class="coins" :aria-label="`${inv.coins} pièces`">
            <Icon name="solar:dollar-minimalistic-bold-duotone" class="coins-ic" />{{ inv.coins }}
          </span>
          <button class="round" aria-label="Fermer la cuisine" @click="close">
            <Icon name="solar:close-circle-bold" class="round-ic" />
          </button>
        </header>

        <!-- 1. Choisir une recette -->
        <div v-if="phase === 'list'" class="body list">
          <article
            v-for="c in cards"
            :key="c.r.id"
            class="card"
            :class="{ locked: c.locked, ready: c.ready && !c.locked, wanted: c.wanted, flash: flashId === c.r.id }"
          >
            <div class="card-top">
              <span class="dish" :style="{ '--d1': c.tint[0], '--d2': c.tint[1] }">
                <Icon :name="c.r.icon" class="dish-ic" />
                <Icon v-if="c.locked" name="solar:lock-keyhole-bold" class="dish-lock" />
              </span>
              <div class="card-main">
                <div class="name-row">
                  <h3>{{ c.r.label }}</h3>
                  <span v-if="!c.known && !c.locked" class="tag new">À découvrir · +10</span>
                  <span v-else-if="c.best" class="stars-mini" :aria-label="`Meilleure note : ${c.best} étoiles`">
                    <Icon v-for="i in 3" :key="i" name="solar:star-bold" class="st" :class="{ on: i <= c.best }" />
                  </span>
                </div>
                <p v-if="c.wanted" class="hint wish"><Icon name="solar:chat-round-dots-bold-duotone" class="hint-ic" />Elle en a envie !</p>
                <p v-else-if="c.taste === 'love'" class="hint love"><Icon name="solar:heart-bold-duotone" class="hint-ic" />Son plat préféré</p>
                <p v-else-if="c.taste === 'dislike'" class="hint meh"><Icon name="solar:emoji-funny-circle-bold-duotone" class="hint-ic" />Elle n'aime pas trop ça</p>
                <div class="fx">
                  <span class="fx-main" :title="'Énergie'"><Icon name="solar:bolt-bold-duotone" class="fx-ic" />+{{ c.r.effects.energy || 0 }} énergie</span>
                  <span v-for="f in c.minor" :key="f.key" class="fx-small" :style="{ color: f.color }">
                    <Icon :name="f.icon" class="fx-sic" />{{ f.v > 0 ? "+" : "" }}{{ f.v }}
                  </span>
                </div>
              </div>
            </div>

            <ul class="ings" aria-label="Ingrédients">
              <li v-for="g in c.ings" :key="g.id" class="ing" :class="{ ok: g.have >= g.need }">
                <Icon :name="g.icon" class="ing-ic" />
                <span class="ing-l">{{ g.label }}</span>
                <span class="ing-n">{{ Math.min(g.have, g.need) }}/{{ g.need }}</span>
              </li>
            </ul>

            <div class="card-actions">
              <template v-if="c.locked">
                <span class="lock-note"><Icon name="solar:lock-keyhole-bold" class="lock-ic" />Au niveau {{ c.r.minLevel }}</span>
              </template>
              <template v-else-if="c.ready">
                <button v-if="c.quick" class="btn ghost" @click="quickCook(c)">
                  <Icon name="solar:magic-stick-3-bold-duotone" class="btn-ic" />Comme d'habitude
                </button>
                <button class="btn primary" @click="startCook(c)">
                  <Icon name="solar:fire-bold-duotone" class="btn-ic" />Cuisiner
                </button>
              </template>
              <template v-else>
                <span v-if="c.unbuyable" class="lock-note">{{ c.unbuyable }} bientôt à l'épicerie</span>
                <button v-else class="btn buy" :disabled="!c.affordable" @click="buyMissing(c)">
                  <Icon name="solar:cart-large-2-bold-duotone" class="btn-ic" />
                  <span v-if="c.affordable">Acheter ce qui manque · {{ c.cost }}</span>
                  <span v-else>Il manque {{ c.cost - inv.coins }} pièce{{ c.cost - inv.coins > 1 ? "s" : "" }}</span>
                  <Icon v-if="c.affordable" name="solar:dollar-minimalistic-bold-duotone" class="btn-coin" />
                </button>
              </template>
            </div>
          </article>
          <p v-if="!cards.length" class="empty">Aucune recette pour l'instant.</p>
        </div>

        <!-- 2. Cuire au bon moment -->
        <div v-else-if="phase === 'cook'" class="body cook" @pointerdown="stopNeedle">
          <div class="meter" :class="[`res-${resultKind}`, { stopped: stopped }]">
            <svg viewBox="0 0 200 118" class="gauge" aria-hidden="true">
              <defs>
                <linearGradient id="kHeat" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#fff1c4" />
                  <stop offset="0.45" stop-color="#ffd36a" />
                  <stop offset="0.75" stop-color="#e98a2c" />
                  <stop offset="1" stop-color="#8a3b16" />
                </linearGradient>
              </defs>
              <path :d="arc(0, 1)" class="track" />
              <path :d="arc(0, 1)" class="heat" stroke="url(#kHeat)" />
              <path :d="arc(zone.c - zone.w2, zone.c + zone.w2)" class="zone" />
              <path :d="arc(zone.c - zone.w3, zone.c + zone.w3)" class="core" />
              <g :transform="`rotate(${(pos - 0.5) * 180} 100 100)`" class="needle">
                <line x1="100" y1="100" x2="100" y2="30" />
                <circle cx="100" cy="30" r="5" />
              </g>
              <circle cx="100" cy="100" r="9" class="hub" />
            </svg>
            <div class="scale"><span>Pâle</span><span class="gold">Doré</span><span>Grillé</span></div>
          </div>

          <div class="pan-wrap">
            <div class="steam" aria-hidden="true"><i /><i /><i /></div>
            <div class="pan" :class="{ sizzle: !stopped }" :style="{ '--doneness': pos }">
              <span class="pan-food"><Icon :name="current?.icon || 'ph:cookie-fill'" class="pan-ic" /></span>
              <span class="handle" />
            </div>
          </div>

          <p class="verdict" :class="`v-${resultKind}`" aria-live="polite">{{ verdict }}</p>
          <div v-if="stopped" class="stars-big" aria-hidden="true">
            <Icon v-for="i in 3" :key="i" name="solar:star-bold" class="sb" :class="{ on: i <= stars }" :style="{ '--i': i }" />
          </div>
          <button v-else class="btn stop" @pointerdown.stop="stopNeedle">
            <Icon name="solar:hand-heart-bold-duotone" class="btn-ic" />Stop !
          </button>
        </div>

        <!-- 3. Le plat est prêt -->
        <div v-else-if="phase === 'result'" class="body result">
          <div class="plate">
            <span class="dish big" :style="{ '--d1': tint(current)[0], '--d2': tint(current)[1] }">
              <Icon :name="current?.icon || 'ph:cookie-fill'" class="dish-ic" />
            </span>
            <div class="stars-big small">
              <Icon v-for="i in 3" :key="i" name="solar:star-bold" class="sb" :class="{ on: i <= stars }" :style="{ '--i': i }" />
            </div>
          </div>
          <p v-if="firstTime" class="discover"><Icon name="solar:stars-bold-duotone" class="hint-ic" />Nouvelle recette découverte !</p>
          <div class="fx center">
            <span class="fx-main"><Icon name="solar:bolt-bold-duotone" class="fx-ic" />+{{ boosted(current?.effects?.energy) }} énergie</span>
            <span v-for="f in minorOf(current, stars)" :key="f.key" class="fx-small" :style="{ color: f.color }">
              <Icon :name="f.icon" class="fx-sic" />{{ f.v > 0 ? "+" : "" }}{{ f.v }}
            </span>
          </div>
          <p v-if="feedBlock" class="note">{{ feedBlock }} Le plat t'attend au frigo.</p>
          <div class="result-actions">
            <button class="btn ghost" @click="keep">
              <Icon name="solar:fridge-bold-duotone" class="btn-ic" />Garder au frigo
            </button>
            <button class="btn primary" :disabled="!!feedBlock" @click="feed">
              <Icon name="solar:hand-heart-bold-duotone" class="btn-ic" />Lui donner
            </button>
          </div>
        </div>

        <!-- 4. Elle a mangé -->
        <div v-else-if="phase === 'fed'" class="body result">
          <p class="line">« {{ fedLine }} »</p>
          <div class="fx center">
            <span v-for="g in fedGains" :key="g.key" class="fx-small big" :style="{ color: g.color }">
              <Icon :name="g.icon" class="fx-sic" />+{{ g.v }}
            </span>
            <span v-if="fedXp" class="fx-small big xp">+{{ fedXp }} xp</span>
          </div>
          <p v-if="store.mealBoostActive" class="note boost"><Icon name="solar:bolt-bold-duotone" class="hint-ic" />Repas bonus : ses jeux l'amusent plus pendant 30 min.</p>
          <div class="result-actions">
            <button class="btn ghost" @click="backToList">
              <Icon name="solar:chef-hat-bold-duotone" class="btn-ic" />Autre recette
            </button>
            <button class="btn primary" @click="close">C'est parfait</button>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
// Cuisine : demi-hauteur pour la voir en 3D au-dessus (elle se penche, bave si elle est
// gourmande, goûte). Choisir une recette → UNE étape de timing « cuire » → 1 à 3 étoiles →
// « Lui donner » ou « Garder au frigo ». Une recette déjà réussie à 3★ se refait d'un geste.
// Le plat est mis au frigo dès la fin de la cuisson (inv.cook) : fermer en cours de route ne perd rien.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { V1_RECIPES, ingredientById, missingIngredients, groceryIngredients, starMult } from "~/lib/catalog";
import { useCreatureMood, gameCommand, gameSay, gameToast } from "~/composables/useCreatureMood";
import { beep, haptic } from "~/composables/useBeep";
import * as live from "~/composables/useLiveCreature";

const props = defineProps({
  open: { type: Boolean, default: false },
  // recette à mettre en avant (envie, suggestion)
  focus: { type: String, default: "" },
});
const emit = defineEmits(["close"]);

const { store } = useCreatureMood();
const inv = useInventoryStore();

const phase = ref("list"); // list | cook | result | fed
const current = ref(null); // recette en cours
const stars = ref(0);
const firstTime = ref(false);
const flashId = ref("");

// ---------- aperçu des effets ----------
const MINOR = [
  { key: "hunger", icon: "solar:donut-bitten-bold-duotone", color: "#e8892a" },
  { key: "fun", icon: "solar:football-bold-duotone", color: "#2fae4a" },
  { key: "health", icon: "solar:heart-bold-duotone", color: "#ef5b9a" },
  { key: "cleanliness", icon: "solar:waterdrop-bold-duotone", color: "#3b9cf0" },
];
const GAIN_META = [{ key: "energy", icon: "solar:bolt-bold-duotone", color: "#7a5ce6" }, ...MINOR];
function minorOf(r, s = 1) {
  if (!r) return [];
  const m = starMult(s);
  return MINOR.filter((f) => r.effects?.[f.key]).map((f) => {
    const v = r.effects[f.key];
    return { ...f, v: v > 0 ? Math.round(v * m) : v };
  });
}
const boosted = (v) => Math.round((v || 0) * starMult(stars.value || 1));

const TINTS = {
  crepes: ["#ffe9b8", "#f2b544"], "salade-fruits": ["#ffe0e6", "#f2627f"], smoothie: ["#ffd9ec", "#e2559c"],
  omelette: ["#fff3b0", "#f0c419"], croque: ["#ffe7c7", "#d98b3a"], "glace-fraise": ["#ffe1ea", "#ef7aa0"],
  pizza: ["#ffe0cc", "#e8603c"], "tarte-pommes": ["#f1f9d9", "#9bc93c"],
};
const tint = (r) => TINTS[r?.id] || ["#eaf7e2", "#4fbf34"];

// ---------- cartes de recettes ----------
const shopIds = computed(() => new Set(groceryIngredients(!!store.features?.collection).map((i) => i.id)));
const tastes = computed(() => store.tastes || {});
function tasteOf(id) {
  try {
    if (tastes.value.food === id && inv.isTasteSeen("food")) return "love";
    if (tastes.value.foodDislike === id && inv.isTasteSeen("foodDislike")) return "dislike";
  } catch { /* goûts indisponibles */ }
  return null;
}
const cards = computed(() => {
  const list = V1_RECIPES.map((r) => {
    const miss = missingIngredients(r.id, inv.pantry);
    const ings = Object.entries(r.ingredients).map(([id, need]) => {
      const ing = ingredientById(id);
      return { id, need, have: inv.pantry[id] || 0, label: ing?.label || id, icon: ing?.icon || "ph:cookie-fill" };
    });
    const unbuyableIds = Object.keys(miss).filter((id) => !shopIds.value.has(id));
    const cost = Object.entries(miss).reduce((s, [id, n]) => s + (ingredientById(id)?.price || 0) * n, 0);
    const locked = (store.level || 1) < (r.minLevel || 1);
    const ready = !Object.keys(miss).length;
    const known = (inv.recipesKnown || []).includes(r.id);
    return {
      r, ings, cost, locked, ready, known,
      best: inv.recipeStars?.[r.id] || 0,
      quick: ready && inv.canQuickCook?.(r.id),
      affordable: inv.coins >= cost,
      unbuyable: unbuyableIds.map((id) => ingredientById(id)?.label || id).join(", "),
      minor: minorOf(r).slice(0, 2),
      taste: tasteOf(r.id),
      wanted: store.wish?.action === "repas" && store.wish?.target === r.id,
      tint: tint(r),
    };
  });
  const rank = (c) => (c.r.id === props.focus || c.wanted ? 0 : c.locked ? 4 : c.ready ? 1 : c.affordable && !c.unbuyable ? 2 : 3);
  return list.sort((a, b) => rank(a) - rank(b) || (a.r.minLevel || 1) - (b.r.minLevel || 1));
});

function buyMissing(c) {
  const miss = missingIngredients(c.r.id, inv.pantry);
  const cost = Object.entries(miss).reduce((s, [id, n]) => s + (ingredientById(id)?.price || 0) * n, 0);
  if (inv.coins < cost) { gameToast("Pas assez de pièces.", "solar:dollar-minimalistic-bold-duotone"); return; }
  for (const [id, n] of Object.entries(miss)) {
    const res = inv.buyIngredient(id, n);
    if (!res?.ok) { gameToast(res?.reason || "Achat impossible.", "solar:cart-large-2-bold-duotone"); return; }
  }
  beep("coin");
  haptic(12);
  flashId.value = c.r.id;
  setTimeout(() => { if (flashId.value === c.r.id) flashId.value = ""; }, 700);
}

// ---------- l'étape « cuire » ----------
const pos = ref(0); // position de l'aiguille, 0 (cru) → 1 (brûlé)
const stopped = ref(false);
const zone = ref({ c: 0.6, w2: 0.12, w3: 0.045 });
let raf = 0, lastT = 0, phaseT = 0, speed = 0.6, startAt = 0, stopTimer = 0;

function arc(a, b) {
  a = Math.max(0, Math.min(1, a)); b = Math.max(0, Math.min(1, b));
  const pt = (p) => {
    const th = Math.PI * (1 - p);
    return `${(100 + 80 * Math.cos(th)).toFixed(2)} ${(100 - 80 * Math.sin(th)).toFixed(2)}`;
  };
  return `M ${pt(a)} A 80 80 0 0 1 ${pt(b)}`;
}

function startCook(c) {
  current.value = c.r;
  stars.value = 0;
  stopped.value = false;
  pos.value = 0;
  // fenêtre plus large si elle est joueuse et en forme ; aiguille un peu plus vive pour les recettes avancées
  let feel = 1;
  try { feel = Math.max(0.8, Math.min(1.25, store.playFeel?.().hitWindow || 1)); } catch { /* défaut */ }
  const w2 = 0.12 * feel, w3 = 0.045 * feel;
  zone.value = { c: 0.5 + Math.random() * 0.26, w2, w3 };
  speed = 0.55 + 0.05 * ((c.r.minLevel || 1) - 1);
  phaseT = 0;
  phase.value = "cook";
  beep("count");
  startAt = performance.now() + 450; // petit temps pour voir la poêle avant que l'aiguille parte
  lastT = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}
function loop(now) {
  if (phase.value !== "cook" || stopped.value) return;
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (now >= startAt && !document.hidden) {
    phaseT += dt * speed * 2;
    const m = phaseT % 2;
    // va-et-vient adouci aux extrémités
    const tri = m < 1 ? m : 2 - m;
    pos.value = tri * tri * (3 - 2 * tri) * 0.25 + tri * 0.75;
  }
  raf = requestAnimationFrame(loop);
}

const resultKind = computed(() => {
  if (!stopped.value) return "run";
  return stars.value === 3 ? "perfect" : stars.value === 2 ? "good" : pos.value < zone.value.c ? "pale" : "burnt";
});
const verdict = computed(() => {
  if (!stopped.value) return pos.value <= 0.001 ? "La poêle chauffe..." : "Arrête l'aiguille dans la zone dorée !";
  return { perfect: "Parfait ! Bien doré !", good: "Bien cuit !", pale: "Un peu pâle, mais mangeable.", burnt: "Oups, un peu grillé !" }[resultKind.value];
});

function stopNeedle() {
  if (phase.value !== "cook" || stopped.value || performance.now() < startAt) return;
  stopped.value = true;
  cancelAnimationFrame(raf);
  const d = Math.abs(pos.value - zone.value.c);
  stars.value = d <= zone.value.w3 ? 3 : d <= zone.value.w2 ? 2 : 1;
  if (stars.value === 3) { beep("star"); haptic([20, 40, 20, 40, 30]); }
  else if (stars.value === 2) { beep("fruit"); haptic([15, 30, 15]); }
  else { beep("fail"); haptic(40); }
  pose(stars.value === 3 ? "proud" : "taste");
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => finishCook(stars.value), 1100);
}

function finishCook(s, label = "") {
  const r = current.value;
  if (!r) return backToList();
  const res = inv.cook(r.id, s);
  if (!res?.ok) {
    gameToast(res?.reason || "Impossible de cuisiner.", "solar:chef-hat-bold-duotone");
    return backToList();
  }
  firstTime.value = !!res.firstTime;
  stars.value = res.stars;
  phase.value = "result";
  pose("taste");
  if (label) gameSay(label);
}

function quickCook(c) {
  current.value = c.r;
  stars.value = 3;
  beep("star");
  haptic([15, 30, 15]);
  finishCook(3, "Comme d'habitude : parfait !");
}

// ---------- servir ----------
const feedBlock = computed(() => {
  if (!current.value) return "";
  void store.tick;
  const c = store.canEatMeal?.(current.value.id);
  return c && !c.ok ? c.reason : "";
});
const fedLine = ref("");
const fedGains = ref([]);
const fedXp = ref(0);

function feed() {
  const r = current.value;
  if (!r || feedBlock.value) return;
  if (!inv.useMeal(r.id)) { gameToast("Le plat n'est plus au frigo.", "solar:fridge-bold-duotone"); return backToList(); }
  pose(null); // rend le visage : sa réaction doit se voir
  const res = store.eatMeal(r.id, stars.value || 1);
  if (!res?.ok) {
    inv.addMeal(r.id, 1);
    gameToast(res?.reason || "Pas maintenant.", "solar:fridge-bold-duotone");
    return;
  }
  // sans goût marqué, l'animation « Miam » classique ; sinon eatMeal montre déjà adore/aime/déteste
  const mood = res.reaction?.mood;
  if (!mood || mood === "meh") gameCommand("react", "nourrir");
  haptic([12, 30, 12]);
  beep(mood === "love" ? "love" : "fruit");
  fedLine.value = res.reaction?.line || (mood === "dislike" ? "Mouais..." : "Miam, merci !");
  fedGains.value = GAIN_META.map((g) => ({ ...g, v: Math.round(res.gains?.[g.key] || 0) })).filter((g) => g.v > 0);
  fedXp.value = res.xp || 0;
  phase.value = "fed";
}
function keep() {
  gameToast(`${current.value?.label || "Le plat"} est au frigo.`, "solar:fridge-bold-duotone");
  beep("tap");
  backToList();
}

// ---------- navigation ----------
const headTitle = computed(() => (phase.value === "list" ? "Cuisine" : current.value?.label || "Cuisine"));
const headSub = computed(() => ({
  list: inv.mealsCount ? `${inv.mealsCount} plat${inv.mealsCount > 1 ? "s" : ""} au frigo` : "Un bon repas lui rend de l'énergie",
  cook: "Cuire au bon moment",
  result: "C'est prêt !",
  fed: "Bon appétit !",
}[phase.value]));

function backToList() {
  cancelAnimationFrame(raf);
  clearTimeout(stopTimer);
  // une cuisson arrêtée mais pas encore enregistrée : on l'enregistre (rien n'est perdu)
  if (phase.value === "cook" && stopped.value && stars.value) { finishCook(stars.value); return; }
  phase.value = "list";
  current.value = null;
  stopped.value = false;
  pose("watch");
}
function close() {
  if (phase.value === "cook" && stopped.value && stars.value) finishCook(stars.value);
  cancelAnimationFrame(raf);
  clearTimeout(stopTimer);
  emit("close");
}
function onBackdrop() {
  if (phase.value === "cook" && !stopped.value) return; // pas de fermeture accidentelle en pleine cuisson
  close();
}

// ---------- elle, en 3D au-dessus ----------
function creature() {
  try {
    if (live.activeActivity?.value) return null;
    return live.liveCreature?.value || live.useLiveCreature?.()?.liveCreature?.value || null;
  } catch { return null; }
}
const gourmande = () => (store.traits?.gourmande || 0) > 0.3 || tastes.value.food === current.value?.id;
// cadrage : elle remonte dans la moitié haute de l'écran, au-dessus de la feuille
const CAM = { position: [0, 2.3, 7.6], target: [0, -0.15, 0], fov: 38 };
let posed = false;
function pose(kind) {
  const c = creature();
  if (!c) return;
  try {
    if (!kind || store.isSleeping || store.exhausted) {
      if (posed) c.setPuppet?.(null);
      posed = false;
      return;
    }
    const drool = gourmande();
    const faces = {
      watch: { eyes: "shiny", brows: "raised", mouth: drool ? "tongue" : "smile", extras: drool ? ["sweat"] : [], gaze: [0, 0.8] },
      cook: { eyes: "wide", brows: "raised", mouth: drool ? "tongue" : "o", extras: drool ? ["sweat"] : [], gaze: [0, 1] },
      taste: { eyes: "arc", brows: "raised", mouth: "tongue", extras: ["blush"], gaze: [0, 0.6] },
      proud: { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"], gaze: [0, 0.4] },
    };
    const body = {
      watch: { posture: "stand", arms: "hug", motion: "sway" },
      cook: { posture: "crouch", arms: "hug", motion: "calm" },
      taste: { posture: "stand", arms: "rest", motion: "sway" },
      proud: { posture: "stand", arms: "up", motion: "hop" },
    };
    c.setPuppet?.({ ...body[kind], face: faces[kind] });
    posed = true;
  } catch { /* 3D indisponible */ }
}
function setFraming(on) {
  const c = creature();
  if (!c) return;
  try {
    c.setCamera?.(on ? CAM : null);
    if (!on && posed) { c.setPuppet?.(null); posed = false; }
  } catch { /* 3D indisponible */ }
}

watch(phase, (p) => { if (p === "cook") pose("cook"); });
watch(() => props.open, (o) => {
  if (o) {
    phase.value = "list";
    current.value = null;
    setFraming(true);
    pose("watch");
    if (gourmande()) setTimeout(() => props.open && phase.value === "list" && gameSay("Ça sent bon... j'ai déjà faim !"), 500);
  } else if (import.meta.client) {
    cancelAnimationFrame(raf);
    clearTimeout(stopTimer);
    setFraming(false);
  }
}, { immediate: true });
const onKey = (e) => e.key === "Escape" && props.open && close();
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  cancelAnimationFrame(raf);
  clearTimeout(stopTimer);
  setFraming(false);
});
</script>

<style scoped>
.k-overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* très léger : elle doit rester visible au-dessus */
  background: linear-gradient(180deg, rgba(40, 20, 60, 0) 30%, rgba(40, 20, 60, 0.18));
}
.k-sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  height: 54vh;
  height: 54dvh;
  min-height: 360px;
  background: linear-gradient(180deg, #ffffff 60%, var(--plate-hi, #fff));
  color: var(--ink);
  border-radius: 32px 32px 0 0;
  padding: 10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
  box-shadow: 0 -10px 40px rgba(30, 15, 50, 0.28), inset 0 2px 0 #fff;
}
.grab { flex: none; width: 44px; height: 5px; border-radius: 999px; background: var(--knob-side, #dde3ea); margin: 0 auto 10px; }
.head { flex: none; display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.badge {
  flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, var(--accent-hi), var(--accent) 70%);
  box-shadow: 0 4px 0 var(--accent-lo), inset 0 2px 0 rgba(255, 255, 255, 0.4);
}
.badge-ic { width: 24px; height: 24px; color: #fff; }
.title { flex: 1; min-width: 0; }
h2 { margin: 0; font: 700 22px/1.1 "Fredoka", "Nunito", system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.subtitle { margin: 2px 0 0; font: 700 13px "Nunito", system-ui, sans-serif; color: color-mix(in srgb, var(--ink) 65%, #fff); }
.coins {
  flex: none; display: inline-flex; align-items: center; gap: 3px; padding: 5px 10px 5px 6px; border-radius: 999px;
  background: #fff8e1; color: #9a6a00; font: 800 14px "Fredoka", "Nunito", sans-serif; box-shadow: inset 0 0 0 1.5px #ffe08a;
}
.coins-ic { width: 18px; height: 18px; color: #f2a900; }
.round {
  flex: none; display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 50%;
  background: #fff; color: var(--ink); cursor: pointer; box-shadow: 0 4px 12px rgba(40, 55, 80, 0.14);
}
.round-ic { width: 22px; height: 22px; }
.body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }

/* ---------- cartes ---------- */
.list { display: flex; flex-direction: column; gap: 10px; padding: 2px 2px 8px; }
.card {
  padding: 12px; border-radius: 22px; border: 2px solid transparent;
  background: linear-gradient(180deg, #ffffff, #f5f7fa);
  box-shadow: 0 4px 12px rgba(40, 55, 80, 0.1), inset 0 1px 0 #fff;
}
.card.ready { border-color: #bfe9a8; }
.card.wanted { border-color: #ff9dbb; background: linear-gradient(180deg, #fff8fa, #ffeef3); }
.card.locked { opacity: 0.62; filter: grayscale(0.4); }
.card.flash { animation: flash 0.6s ease-out; }
@keyframes flash { 0% { box-shadow: 0 0 0 0 rgba(79, 191, 52, 0.6); transform: scale(1.02); } 100% { box-shadow: 0 0 0 14px rgba(79, 191, 52, 0); transform: scale(1); } }
.card-top { display: flex; gap: 12px; align-items: flex-start; }
.dish {
  position: relative; flex: none; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 18px;
  background: radial-gradient(circle at 35% 30%, #fff, var(--d1) 60%);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--d2) 30%, transparent), 0 3px 8px rgba(40, 55, 80, 0.12);
}
.dish-ic { width: 32px; height: 32px; color: var(--d2); filter: drop-shadow(0 2px 2px rgba(40, 55, 80, 0.18)); }
.dish-lock { position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; padding: 3px; border-radius: 50%; background: #fff; color: #8a94a3; }
.dish.big { width: 96px; height: 96px; border-radius: 32px; }
.dish.big .dish-ic { width: 58px; height: 58px; }
.card-main { flex: 1; min-width: 0; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
h3 { margin: 0; font: 700 17px/1.15 "Fredoka", "Nunito", system-ui, sans-serif; }
.tag { padding: 2px 8px; border-radius: 999px; font: 800 11px "Nunito", sans-serif; }
.tag.new { background: #fff3c4; color: #a26b00; }
.stars-mini { display: inline-flex; gap: 1px; }
.st { width: 14px; height: 14px; color: #dfe4ea; }
.st.on { color: #ffc21a; }
.hint { display: flex; align-items: center; gap: 4px; margin: 3px 0 0; font: 800 12px "Nunito", sans-serif; }
.hint-ic { width: 16px; height: 16px; flex: none; }
.hint.love { color: #e2457a; }
.hint.wish { color: #e2457a; }
.hint.meh { color: #8a7a60; }
.fx { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; }
.fx.center { justify-content: center; margin: 8px 0; }
.fx-main {
  display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px 3px 5px; border-radius: 999px;
  background: #efeaff; color: #5b3fd0; font: 800 13px "Fredoka", "Nunito", sans-serif;
}
.fx-ic { width: 17px; height: 17px; color: #7a5ce6; }
.fx-small { display: inline-flex; align-items: center; gap: 2px; font: 800 12px "Fredoka", "Nunito", sans-serif; }
.fx-small.big { font-size: 16px; padding: 3px 9px; border-radius: 999px; background: #fff; box-shadow: 0 2px 6px rgba(40, 55, 80, 0.1); animation: pop 0.4s cubic-bezier(0.3, 1.6, 0.5, 1) both; }
.fx-small.xp { color: #2a9a3a; }
.fx-sic { width: 15px; height: 15px; }
.ings { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0; padding: 0; list-style: none; }
.ing {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px 4px 6px; border-radius: 999px;
  background: #fff1f0; color: #b8433a; font: 800 12px "Nunito", sans-serif; box-shadow: inset 0 0 0 1.5px #ffd2cd;
}
.ing.ok { background: #eefbe7; color: #2f8a22; box-shadow: inset 0 0 0 1.5px #c9efb5; }
.ing-ic { width: 15px; height: 15px; }
.ing-n { opacity: 0.85; }
.card-actions { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 10px; }
.lock-note { display: inline-flex; align-items: center; gap: 4px; font: 800 12px "Nunito", sans-serif; color: #7d8794; }
.lock-ic { width: 14px; height: 14px; }
.empty { text-align: center; font-weight: 700; color: #7d8794; }

/* ---------- boutons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 42px; padding: 0 16px;
  border: 0; border-radius: 999px; cursor: pointer; font: 700 15px "Fredoka", "Nunito", system-ui, sans-serif;
  -webkit-tap-highlight-color: transparent; transition: transform 0.08s, box-shadow 0.08s;
}
.btn:active:not(:disabled) { transform: translateY(2px) scale(0.98); }
.btn:disabled { cursor: default; opacity: 0.55; filter: grayscale(0.4); }
.btn-ic { width: 20px; height: 20px; }
.btn-coin { width: 17px; height: 17px; color: #f2a900; }
.btn.primary { color: #fff; background: linear-gradient(180deg, var(--accent-hi), var(--accent)); box-shadow: 0 4px 0 var(--accent-lo), inset 0 2px 0 rgba(255, 255, 255, 0.35); }
.btn.ghost { color: var(--ink); background: #fff; box-shadow: 0 3px 0 #e1e6ec, inset 0 0 0 2px #e8edf2; }
.btn.buy { color: #7a5200; background: linear-gradient(180deg, #fff3c4, #ffe08a); box-shadow: 0 3px 0 #e8bf4a; }
.btn.stop {
  min-height: 58px; min-width: 200px; font-size: 22px; color: #fff;
  background: linear-gradient(180deg, #ffb347, #f07f1c); box-shadow: 0 5px 0 #c25a12, inset 0 2px 0 rgba(255, 255, 255, 0.4);
  animation: breathe 1.2s ease-in-out infinite;
}
.btn.stop .btn-ic { width: 26px; height: 26px; }
@keyframes breathe { 50% { transform: scale(1.05); } }

/* ---------- cuisson ---------- */
.cook { display: flex; flex-direction: column; align-items: center; gap: 4px; padding-top: 4px; touch-action: manipulation; user-select: none; -webkit-user-select: none; cursor: pointer; }
.meter { position: relative; width: min(280px, 82%); }
.gauge { display: block; width: 100%; overflow: visible; }
.track { fill: none; stroke: #eef1f5; stroke-width: 24; stroke-linecap: round; }
.heat { fill: none; stroke-width: 16; stroke-linecap: round; opacity: 0.9; }
.zone { fill: none; stroke: #ffc21a; stroke-width: 22; stroke-linecap: butt; opacity: 0.55; }
.core { fill: none; stroke: #ffb000; stroke-width: 26; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(255, 190, 0, 0.8)); animation: glow 0.9s ease-in-out infinite; }
@keyframes glow { 50% { opacity: 0.7; } }
.needle line { stroke: #3a2a20; stroke-width: 5; stroke-linecap: round; }
.needle circle { fill: #3a2a20; }
.hub { fill: #fff; stroke: #3a2a20; stroke-width: 4; }
.scale { display: flex; justify-content: space-between; margin-top: -6px; font: 800 11px "Nunito", sans-serif; color: #98a1ad; }
.scale .gold { color: #d79a00; }
.meter.stopped.res-perfect .gauge { animation: bounce 0.5s cubic-bezier(0.3, 1.8, 0.5, 1); }
.meter.stopped.res-pale .gauge, .meter.stopped.res-burnt .gauge { animation: shake 0.35s ease-in-out; }
@keyframes bounce { 0% { transform: scale(0.94); } 100% { transform: scale(1); } }
@keyframes shake { 25% { transform: translateX(-5px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-2px); } }

.pan-wrap { position: relative; height: 74px; display: grid; place-items: center; margin-top: 2px; }
.pan {
  position: relative; width: 120px; height: 46px; border-radius: 50%;
  background: radial-gradient(ellipse at 50% 40%, #5c6470, #2f343c 70%);
  box-shadow: 0 6px 0 #1f232a, 0 10px 18px rgba(30, 30, 40, 0.3);
}
.pan.sizzle { animation: sizzle 0.12s steps(2) infinite; }
@keyframes sizzle { 50% { transform: translate(0.6px, -0.6px); } }
.pan-food {
  position: absolute; left: 50%; top: 50%; display: grid; place-items: center; width: 64px; height: 30px; border-radius: 50%;
  transform: translate(-50%, -55%);
  /* la couleur passe du pâle au doré puis au grillé */
  background: color-mix(in srgb, #ffe7a8, #a0521c calc(var(--doneness) * 100%));
}
.pan-ic { width: 26px; height: 26px; color: #fff; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.handle { position: absolute; right: -50px; top: 50%; width: 56px; height: 12px; border-radius: 8px; background: #2f343c; transform: translateY(-50%) rotate(-8deg); }
.steam { position: absolute; top: -16px; left: 50%; transform: translateX(-50%); display: flex; gap: 14px; }
.steam i { display: block; width: 8px; height: 22px; border-radius: 999px; background: rgba(200, 210, 220, 0.7); animation: steam 1.4s ease-in infinite; }
.steam i:nth-child(2) { animation-delay: 0.45s; }
.steam i:nth-child(3) { animation-delay: 0.9s; }
@keyframes steam { 0% { transform: translateY(10px) scaleY(0.6); opacity: 0; } 40% { opacity: 0.9; } 100% { transform: translateY(-18px) scaleY(1.2); opacity: 0; } }
.verdict { margin: 4px 0 2px; min-height: 22px; text-align: center; font: 700 17px "Fredoka", "Nunito", sans-serif; color: #4a5565; }
.verdict.v-perfect { color: #d08a00; font-size: 21px; }
.verdict.v-good { color: #2f8a22; }
.verdict.v-pale, .verdict.v-burnt { color: #b0623a; }
.stars-big { display: flex; gap: 6px; justify-content: center; min-height: 58px; }
.stars-big.small { min-height: 0; margin-top: -14px; }
.sb { width: 52px; height: 52px; color: #e3e7ec; filter: drop-shadow(0 3px 2px rgba(40, 55, 80, 0.15)); animation: pop 0.45s cubic-bezier(0.3, 1.8, 0.5, 1) both; animation-delay: calc(var(--i) * 0.14s); }
.stars-big.small .sb { width: 30px; height: 30px; }
.sb.on { color: #ffc21a; filter: drop-shadow(0 0 6px rgba(255, 190, 0, 0.7)); }
@keyframes pop { 0% { transform: scale(0) rotate(-30deg); opacity: 0; } 100% { transform: scale(1) rotate(0); opacity: 1; } }

/* ---------- résultat ---------- */
.result { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 4px; }
.plate { display: flex; flex-direction: column; align-items: center; animation: pop 0.45s cubic-bezier(0.3, 1.6, 0.5, 1); }
.discover { display: inline-flex; align-items: center; gap: 4px; margin: 6px 0 0; padding: 4px 12px; border-radius: 999px; background: #fff3c4; color: #a26b00; font: 800 13px "Nunito", sans-serif; }
.note { margin: 2px 0 6px; font: 700 13px "Nunito", sans-serif; color: #7d8794; display: inline-flex; align-items: center; gap: 4px; }
.note.boost { color: #5b3fd0; }
.line { margin: 8px 0 2px; font: 700 20px/1.25 "Fredoka", "Nunito", sans-serif; color: var(--ink); }
.result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: auto; padding-top: 10px; width: 100%; }
.result-actions .btn { flex: 1; max-width: 200px; }

.ksheet-enter-active, .ksheet-leave-active { transition: opacity 0.25s; }
.ksheet-enter-active .k-sheet, .ksheet-leave-active .k-sheet { transition: transform 0.32s cubic-bezier(0.3, 1.2, 0.5, 1); }
.ksheet-enter-from, .ksheet-leave-to { opacity: 0; }
.ksheet-enter-from .k-sheet, .ksheet-leave-to .k-sheet { transform: translateY(100%); }
@media (prefers-reduced-motion: reduce) {
  .ksheet-enter-active .k-sheet, .ksheet-leave-active .k-sheet { transition: none; }
  .btn.stop, .pan.sizzle, .steam i, .core { animation: none; }
}
</style>
