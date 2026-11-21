<template>
  <!-- Garde-robe : onglet « Tenues » du Sac. Tout se porte tout de suite, c'est gratuit. -->
  <div class="wardrobe">
    <div class="top">
      <div class="count">
        <Icon name="solar:hanger-bold-duotone" class="count-ic" />
        <div>
          <b>{{ inv.collected }}</b><span> / {{ inv.totalVariants }}</span>
          <small>coloris dans ta collection</small>
        </div>
      </div>
      <button class="pill" :disabled="!ownedCount" @click="shuffle">
        <Icon name="solar:magic-stick-3-bold-duotone" class="pill-ic" />
        Au hasard
      </button>
    </div>

    <!-- emplacements -->
    <div class="slots" role="tablist" aria-label="Emplacements">
      <button
        v-for="s in SLOTS"
        :key="s"
        class="slot"
        role="tab"
        :aria-selected="slot === s"
        :class="{ on: slot === s, worn: !!inv.outfit[s] }"
        @click="pickSlot(s)"
      >
        <span v-if="slotHasNew(s)" class="new-dot" />
        <span class="slot-badge" :style="slotSwatch(s)">
          <Icon :name="SLOT_ICONS[s]" class="slot-ic" />
        </span>
        <span class="slot-lbl">{{ SLOT_LABELS[s] }}</span>
      </button>
    </div>

    <!-- sa réaction au dernier essayage -->
    <Transition name="pop">
      <div v-if="said" :key="said.id" class="said" :class="said.mood">
        <Icon :name="MOOD_ICON[said.mood] || 'solar:chat-round-dots-bold-duotone'" class="said-ic" />
        <span>« {{ said.line }} »</span>
      </div>
    </Transition>

    <!-- objets possédés pour cet emplacement -->
    <div v-if="items.length" class="grid">
      <button
        v-for="it in items"
        :key="it.id"
        class="card"
        :class="{ worn: wornId === it.id, sel: selId === it.id }"
        @click="pickItem(it)"
      >
        <span v-if="inv.isNew(it.id)" class="tag new">Nouveau</span>
        <Icon v-else-if="lovedItem(it.id)" name="solar:heart-bold-duotone" class="tag heart" />
        <span class="swatch big" :style="swatchStyle(cardColor(it))">
          <Icon :name="SLOT_ICONS[it.slot]" class="card-ic" />
        </span>
        <span class="card-lbl">{{ it.label }}</span>
        <span class="card-sub">{{ ownedOf(it.id).length }} / {{ itemColors(it).length }} coloris</span>
        <Icon v-if="wornId === it.id" name="solar:check-circle-bold" class="worn-ic" />
      </button>
    </div>
    <div v-else class="empty">
      <Icon :name="SLOT_ICONS[slot]" class="empty-ic" />
      <p>Rien à mettre ici pour l'instant.</p>
      <button v-if="hasShop" class="link" @click="emit('shop', null)">
        <Icon name="solar:shop-bold-duotone" class="link-ic" /> Voir la Boutique
      </button>
    </div>

    <!-- couleurs de l'objet choisi -->
    <div v-if="selItem" class="colors">
      <div class="colors-head">
        <span class="colors-title"><Icon name="solar:palette-bold-duotone" class="ct-ic" />{{ selItem.label }}</span>
        <button v-if="wornId === selItem.id" class="link off" @click="takeOff">
          <Icon name="solar:close-circle-bold" class="link-ic" /> Retirer
        </button>
      </div>
      <div class="chips">
        <button
          v-for="c in ownedOf(selItem.id)"
          :key="c"
          class="chip"
          :class="{ on: wornId === selItem.id && wornColor === c }"
          :aria-label="COLORS[c]?.label"
          :title="COLORS[c]?.label"
          @click="wear(selItem, c)"
        >
          <span class="swatch" :style="swatchStyle(c)" />
          <span v-if="inv.isNew(selItem.id, c)" class="new-dot small" />
          <Icon v-else-if="lovedColor(c)" name="solar:heart-bold-duotone" class="chip-heart" />
        </button>
        <button v-if="hasShop && missingColors(selItem) > 0" class="more" @click="emit('shop', selItem.id)">
          <Icon name="solar:shop-bold-duotone" class="link-ic" />
          Plus de couleurs
          <small>+{{ missingColors(selItem) }}</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { gameCommand, gameSay } from "~/composables/useCreatureMood";
import { COLORS, SLOTS, SLOT_LABELS, SLOT_ICONS, V1_ITEMS, itemById, itemColors } from "~/lib/catalog";

// 'shop' : ouvrir la Boutique (itemId = l'objet dont on veut d'autres couleurs, ou null)
const emit = defineEmits(["shop"]);
const props = defineProps({
  // emplacement ouvert au départ (ex. depuis une envie de tenue)
  initialSlot: { type: String, default: "" },
  // vêtement à mettre en avant (id) : ouvre son emplacement et le sélectionne
  focus: { type: String, default: "" },
});

const inv = useInventoryStore();
const store = useTamagotchiStore();

const MOOD_ICON = {
  love: "solar:heart-bold-duotone",
  like: "solar:emoji-funny-circle-bold-duotone",
  meh: "solar:chat-round-dots-bold-duotone",
  dislike: "solar:chat-round-dots-bold-duotone",
};
const MOOD_RANK = { love: 3, dislike: 2, like: 1, meh: 0 };

const focusSlot = () => {
  const it = props.focus ? itemById(props.focus) : null;
  return it && inv.ownsItem(it.id) ? it.slot : "";
};
const firstSlot = () => {
  if (focusSlot()) return focusSlot();
  if (SLOTS.includes(props.initialSlot)) return props.initialSlot;
  return SLOTS.find((s) => mine(s).length) || "tete";
};
const mine = (s) => V1_ITEMS.filter((i) => i.slot === s && inv.ownsItem(i.id));

const slot = ref(firstSlot());
const selId = ref(focusSlot() ? props.focus : inv.outfit[slot.value]?.id || null);
const said = ref(null);
let saidTimer = null;

const hasShop = computed(() => !!store.features?.boutique);
const ownedCount = computed(() => V1_ITEMS.filter((i) => inv.ownsItem(i.id)).length);
const items = computed(() => mine(slot.value));
const wornId = computed(() => inv.outfit[slot.value]?.id || null);
const wornColor = computed(() => inv.outfit[slot.value]?.color || null);
const selItem = computed(() => (selId.value ? items.value.find((i) => i.id === selId.value) || null : null));

watch(() => props.initialSlot, (s) => { if (SLOTS.includes(s)) pickSlot(s); });
watch(() => props.focus, () => {
  const s = focusSlot();
  if (s) { slot.value = s; selId.value = props.focus; }
});

const ownedOf = (id) => {
  const it = itemById(id);
  const avail = it ? itemColors(it) : [];
  return (inv.owned[id] || []).filter((c) => avail.includes(c));
};
const missingColors = (it) => itemColors(it).length - ownedOf(it.id).length;
const slotHasNew = (s) => mine(s).some((i) => inv.isNew(i.id));
const cardColor = (it) => (wornId.value === it.id ? wornColor.value : ownedOf(it.id)[0]);

// ses goûts déjà découverts (jamais de spoiler)
const tastes = computed(() => store.tastes || {});
const lovedColor = (c) => inv.isTasteSeen("color") && tastes.value.color === c;
const lovedItem = (id) => inv.isTasteSeen("itemLove") && tastes.value.itemLove === id;

function swatchStyle(key) {
  const c = COLORS[key];
  if (!c) return { background: "#e9edf2" };
  if (key === "or") return { background: "linear-gradient(135deg, #fff3b0, #ffcc33 45%, #b8860b)" };
  if (key === "galaxie") {
    return { background: "radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 60% 30%, #b06bff, #2a1b5e 70%)" };
  }
  return { background: c.hex };
}
function slotSwatch(s) {
  const e = inv.outfit[s];
  return e ? swatchStyle(e.color) : {};
}

function pickSlot(s) {
  slot.value = s;
  selId.value = inv.outfit[s]?.id || null;
}
function pickItem(it) {
  selId.value = it.id;
  if (wornId.value === it.id) return;
  // on enfile la couleur qu'elle préfère si on la connaît, sinon la première
  const colors = ownedOf(it.id);
  const c = colors.find((k) => lovedColor(k)) || colors.find((k) => inv.isNew(it.id, k)) || colors[0];
  if (c) wear(it, c);
}

function showSaid(r) {
  if (!r?.line) return;
  clearTimeout(saidTimer);
  said.value = { id: Math.random(), mood: r.mood, line: r.line };
  saidTimer = setTimeout(() => (said.value = null), 3200);
}

// équipe tout de suite ; la réaction (yeux cœur si elle adore, bouderie si elle déteste)
// est jouée par le store via onEquip (react + réplique)
function wear(it, color) {
  const res = inv.equip(it.slot, it.id, color);
  if (res && res.reaction) showSaid(res.reaction);
  try { navigator.vibrate?.(12); } catch { /* pas de vibreur */ }
}

function takeOff() {
  if (inv.unequip(slot.value)) {
    said.value = null;
    gameSay(store.stage === "bebe" ? "Tout nu !" : "Hop, enlevé.");
  }
}

// tenue surprise : sa réaction la plus forte (adore ou boude) parmi les pièces tirées
function shuffle() {
  const next = inv.randomOutfit();
  selId.value = next[slot.value]?.id || null;
  let best = null;
  for (const s of SLOTS) {
    const e = next[s];
    if (!e) continue;
    const r = store.tasteReactionFor("item", e.id, e.color);
    if (!best || MOOD_RANK[r.mood] > MOOD_RANK[best.mood]) best = r;
  }
  // une seule réplique : dans la bulle du panneau (la créature réagit sans la répéter)
  if (best && (best.mood === "love" || best.mood === "dislike")) {
    store.showReaction(best, { say: false });
    gameCommand("react", best.mood === "love" ? "adore" : "deteste");
    showSaid(best);
  } else {
    showSaid({ mood: "like", line: Object.values(next).some(Boolean) ? "Ta-da ! Nouvelle tenue !" : "Tenue légère aujourd'hui !" });
  }
}
</script>

<style scoped>
.wardrobe { display: flex; flex-direction: column; gap: 12px; font-family: "Nunito", system-ui, sans-serif; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.count { display: flex; align-items: center; gap: 8px; color: #4a5565; }
.count-ic { width: 34px; height: 34px; color: #4fbf34; }
.count b { font: 800 20px "Fredoka", "Nunito", system-ui, sans-serif; color: #2b3442; }
.count span { font-weight: 800; color: #8a97a8; }
.count small { display: block; font-size: 11px; font-weight: 700; color: #8a97a8; margin-top: -2px; }
.pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; border: 0; border-radius: 999px;
  background: linear-gradient(180deg, #6fd34f, #4fbf34); color: #fff;
  font: 800 13px "Nunito", system-ui, sans-serif;
  box-shadow: 0 4px 10px rgba(80, 180, 50, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.08s;
}
.pill:active { transform: scale(0.95); }
.pill:disabled { opacity: 0.45; box-shadow: none; }
.pill-ic { width: 18px; height: 18px; }

.slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.slot {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 8px 2px 7px; border: 2px solid transparent; border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f3f5f8);
  box-shadow: 0 3px 8px rgba(40, 55, 80, 0.1), inset 0 1px 0 #fff;
  cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.08s;
}
.slot:active { transform: scale(0.95); }
.slot.on { border-color: #8fdc6a; background: linear-gradient(180deg, #f3fdec, #e2f7d4); }
.slot-badge {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 12px;
  background: #eef1f5; box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.08);
}
.slot.worn .slot-badge { box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15), 0 0 0 2px #fff, 0 0 0 3px rgba(40, 55, 80, 0.15); }
.slot-ic { width: 22px; height: 22px; color: #4a5565; filter: drop-shadow(0 1px 0 rgba(255, 255, 255, 0.7)); }
.slot-lbl { font: 800 11px/1 "Nunito", system-ui, sans-serif; color: #4a5565; }

.new-dot { position: absolute; top: 5px; right: 6px; width: 9px; height: 9px; border-radius: 50%; background: #ff4f86; box-shadow: 0 0 0 2px #fff; }
.new-dot.small { top: -2px; right: -2px; width: 8px; height: 8px; }

.said {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 16px;
  background: #fff; color: #4a5565; font: 700 13px "Nunito", system-ui, sans-serif;
  box-shadow: 0 3px 10px rgba(40, 55, 80, 0.1);
}
.said.love { background: linear-gradient(180deg, #fff6f9, #ffe3ec); color: #c2185b; }
.said.dislike { background: #f4f5f8; color: #6b7280; }
.said-ic { width: 22px; height: 22px; flex: none; }
.pop-enter-active { transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.2s; }
.pop-leave-active { transition: opacity 0.2s; }
.pop-enter-from { transform: scale(0.85); opacity: 0; }
.pop-leave-to { opacity: 0; }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.card {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 12px 4px 9px; border: 2px solid transparent; border-radius: 18px;
  background: linear-gradient(180deg, #ffffff, #f3f5f8);
  box-shadow: 0 4px 10px rgba(40, 55, 80, 0.1), inset 0 1px 0 #fff;
  cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.08s;
}
.card:active { transform: scale(0.95); }
.card.sel { border-color: #c9d2dc; }
.card.worn { border-color: #8fdc6a; background: linear-gradient(180deg, #f3fdec, #e2f7d4); }
.swatch {
  display: block; width: 26px; height: 26px; border-radius: 50%;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.14), inset 0 2px 0 rgba(255, 255, 255, 0.35), 0 0 0 1px rgba(40, 55, 80, 0.12);
}
.swatch.big { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 18px; }
.card-ic { width: 30px; height: 30px; color: rgba(255, 255, 255, 0.92); filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.35)); }
.card-lbl { font: 800 12px/1.15 "Nunito", system-ui, sans-serif; color: #2b3442; text-align: center; margin-top: 4px; }
.card-sub { font: 700 10px "Nunito", system-ui, sans-serif; color: #8a97a8; }
.worn-ic { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; color: #4fbf34; }
.tag { position: absolute; top: 6px; left: 6px; }
.tag.new { padding: 2px 6px; border-radius: 999px; background: #ff4f86; color: #fff; font: 800 9px/1.2 "Nunito", system-ui, sans-serif; }
.tag.heart { width: 18px; height: 18px; color: #ff4f86; }

.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px 10px; border-radius: 18px; background: #f6f8fa; color: #8a97a8; text-align: center; }
.empty p { margin: 0; font: 700 13px "Nunito", system-ui, sans-serif; }
.empty-ic { width: 40px; height: 40px; opacity: 0.5; }

.colors { padding: 12px; border-radius: 18px; background: #fff; box-shadow: 0 4px 12px rgba(40, 55, 80, 0.1); }
.colors-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.colors-title { display: inline-flex; align-items: center; gap: 6px; font: 800 14px "Fredoka", "Nunito", system-ui, sans-serif; color: #2b3442; }
.ct-ic { width: 20px; height: 20px; color: #9b6be0; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.chip {
  position: relative; display: grid; place-items: center; width: 40px; height: 40px; padding: 0;
  border: 3px solid transparent; border-radius: 50%; background: #fff; cursor: pointer;
  -webkit-tap-highlight-color: transparent; transition: transform 0.08s;
}
.chip .swatch { width: 30px; height: 30px; }
.chip:active { transform: scale(0.9); }
.chip.on { border-color: #4fbf34; box-shadow: 0 0 0 2px #e2f7d4; }
.chip-heart { position: absolute; top: -5px; right: -5px; width: 16px; height: 16px; color: #ff4f86; filter: drop-shadow(0 1px 0 #fff); }
.link, .more {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 0; border-radius: 999px;
  background: #eef9e8; color: #2a9a3a; font: 800 12px "Nunito", system-ui, sans-serif; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.link.off { background: #f4f5f8; color: #6b7280; }
.more small { font-weight: 800; opacity: 0.7; }
.link-ic { width: 16px; height: 16px; }
</style>
