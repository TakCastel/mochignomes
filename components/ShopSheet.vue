<template>
  <div ref="root" class="ui-page shop">
    <!-- 1. où je suis : porte-monnaie, et le coffre du jour en petit bouton -->
    <div class="top">
      <CurrencyBar />
      <button class="chest-btn" :class="{ ready: inv.chestReady }" :aria-label="inv.chestReady ? 'Ouvrir le coffre gratuit du jour' : 'Coffre déjà ouvert aujourd\'hui'" @click="openChest">
        <Icon name="solar:gift-bold-duotone" class="ic chest-ic" />
        <span>{{ inv.chestReady ? "Coffre offert" : "Demain !" }}</span>
        <span v-if="inv.chestReady" class="ui-dot" aria-hidden="true" />
      </button>
    </div>

    <!-- 2. le rayon -->
    <nav v-if="tabs.length > 1" class="ui-tabs" role="tablist" aria-label="Rayons de la boutique">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        class="ui-tab"
        :class="{ 'is-on': tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" class="ic" />
        <span>{{ t.label }}</span>
      </button>
    </nav>

    <!-- ============ VÊTEMENTS ============ -->
    <section v-if="tab === 'vetements'" class="ui-stack">
      <!-- catégories : rangée d'icônes, un seul niveau -->
      <div class="cats" role="radiogroup" aria-label="Catégorie">
        <button v-for="s in slotChips" :key="s.key" class="cat" :class="{ 'is-on': slotFilter === s.key }" role="radio" :aria-checked="slotFilter === s.key" @click="slotFilter = s.key">
          <Icon :name="s.icon || 'solar:widget-bold-duotone'" class="ic" />
          <span>{{ s.label }}</span>
        </button>
      </div>

      <!-- 3. les articles ; l'offre du jour est la première carte, pleine largeur -->
      <div :key="slotFilter" class="grid">
        <button v-if="dailyItem && (slotFilter === 'all' || slotFilter === dailyItem.slot)" class="offer" :style="{ '--ink': inkFor(daily.color), '--i': 0 }" @click="openDetail(dailyItem.id, daily.color)">
          <span class="offer-art"><Icon :name="itemIcon(dailyItem.id)" class="offer-ic" /></span>
          <span class="offer-main">
            <span class="offer-kicker">Coloris du jour</span>
            <span class="offer-title">{{ dailyItem.label }} {{ colorLabel(daily.color) }}</span>
          </span>
          <span v-if="inv.ownsColor(dailyItem.id, daily.color)" class="offer-end"><Icon name="solar:check-circle-bold" class="ic" />À toi</span>
          <span v-else class="offer-end">
            <span class="offer-badge">−{{ Math.round((daily.discount || 0) * 100) }} %</span>
            <span class="ui-price"><s>{{ basePrice(dailyItem.id, daily.color).amount }}</s><Icon :name="curIcon('coins')" class="ic" />{{ inv.itemPrice(dailyItem.id, daily.color).amount }}</span>
          </span>
        </button>

        <button
          v-for="(c, n) in cards"
          :key="c.item.id"
          class="item"
          :class="{ locked: !!c.lock }"
          :style="{ '--ink': inkFor(c.color), '--i': Math.min(n + 1, 14) }"
          :aria-label="`${c.item.label}${c.lock ? ' (' + c.lock + ')' : c.have === c.total ? ' (déjà à toi)' : ''}`"
          @click="openDetail(c.item.id)"
        >
          <span v-if="c.isNew" class="ui-dot" aria-hidden="true" />
          <span v-if="c.isDaily" class="promo">−{{ Math.round((daily.discount || 0) * 100) }} %</span>
          <span v-else-if="!c.lock && c.have === c.total" class="owned" aria-hidden="true"><Icon name="solar:check-circle-bold" class="ic" /></span>
          <span class="art">
            <Icon :name="itemIcon(c.item.id)" class="art-ic" />
            <Icon v-if="c.lock" name="solar:lock-keyhole-bold" class="art-lock" />
          </span>
          <span class="name">{{ c.item.label }}</span>
          <span class="meta">
            <span v-if="c.lock" class="soon">{{ c.lockShort }}</span>
            <span v-else-if="c.have === c.total" class="soon">Déjà à toi</span>
            <span v-else class="ui-price small">
              <Icon :name="curIcon(c.from.currency)" class="ic" :class="c.from.currency" />{{ c.from.amount }}
            </span>
          </span>
        </button>
      </div>
      <p class="ui-foot-note">Tout s'achète avec des pièces gagnées en jouant. Clique sur un article pour choisir sa couleur et l'essayer.</p>
    </section>

    <!-- ============ ÉPICERIE ============ -->
    <section v-else-if="tab === 'epicerie'" class="ui-stack">
      <div class="ui-stack ui-stack--sm">
        <div v-for="ing in groceries" :id="'shop-' + ing.id" :key="ing.id" class="ui-row" :class="{ focus: focusId === ing.id }">
          <span class="ui-thumb"><FoodImg :id="ing.id" :emoji="ing.emoji" /></span>
          <span class="ui-row-main">
            <span class="ui-row-title">{{ ing.label }}</span>
            <span class="ui-row-sub">Au frigo : {{ inv.pantry[ing.id] || 0 }}</span>
          </span>
          <span class="stepper" role="group" :aria-label="`Quantité de ${ing.label}`">
            <button class="step" aria-label="Moins" :disabled="qtyOf(ing.id) <= 1" @click="setQty(ing.id, -1)"><Icon name="solar:minus-circle-bold" class="step-ic" /></button>
            <span class="qty ui-num">{{ qtyOf(ing.id) }}</span>
            <button class="step" aria-label="Plus" :disabled="qtyOf(ing.id) >= 9" @click="setQty(ing.id, 1)"><Icon name="solar:add-circle-bold" class="step-ic" /></button>
          </span>
          <button class="ui-btn ui-btn--primary ui-btn--sm" :class="{ 'is-poor': inv.coins < ing.price * qtyOf(ing.id) }" @click="buyIng(ing)">
            <span class="ui-price"><Icon :name="curIcon('coins')" class="ic" />{{ ing.price * qtyOf(ing.id) }}</span>
          </button>
          <span v-for="f in floats.filter((x) => x.key === ing.id)" :key="f.id" class="float">+{{ f.n }}</span>
        </div>
      </div>
      <p v-if="groceriesSoon.length" class="ui-foot-note">D'autres ingrédients arriveront bientôt dans l'épicerie.</p>
      <button v-if="store.hasFeature?.('cuisine')" class="ui-btn ui-btn--soft center" @click="emit('navigate', { to: 'cuisine' })">
        <Icon name="solar:chef-hat-bold-duotone" class="ic" />Aller cuisiner
      </button>
    </section>

    <!-- ============ OBJETS ============ -->
    <section v-else-if="tab === 'objets'" class="ui-stack">
      <div class="ui-stack ui-stack--sm">
        <div v-for="p in propRows.filter((r) => r.state === 'buy' || r.state === 'owned')" :id="'shop-' + p.prop.id" :key="p.prop.id" class="ui-row" :class="{ focus: focusId === p.prop.id }">
          <span class="ui-thumb ui-thumb--accent"><Icon :name="p.prop.icon" class="ic" /></span>
          <span class="ui-row-main">
            <span class="ui-row-title">{{ p.prop.label }}</span>
            <span class="ui-row-sub">{{ p.sub }}</span>
          </span>
          <span v-if="p.state === 'owned'" class="ui-tag ui-tag--accent"><Icon name="solar:check-circle-bold" class="ic" />Dans le pré</span>
          <button v-else-if="p.state === 'buy'" class="ui-btn ui-btn--primary ui-btn--sm" :class="{ 'is-poor': inv.coins < p.prop.price }" @click="buyPropRow(p.prop)">
            <span v-if="p.prop.price" class="ui-price"><Icon :name="curIcon('coins')" class="ic" />{{ p.prop.price }}</span>
            <template v-else>Gratuit</template>
          </button>
        </div>
      </div>
      <p class="ui-foot-note">Les objets d'activité sont offerts quand elle découvre une nouvelle activité.</p>
    </section>

    <!-- ============ ÉTOILES (mode test uniquement) ============ -->
    <section v-else-if="tab === 'etoiles'" class="ui-stack">
      <p class="ui-note ui-note--warn"><Icon name="solar:danger-circle-bold-duotone" class="ic" />Mode test (?achats=test) : aucun paiement réel.</p>
      <div class="ui-stack ui-stack--sm">
        <div v-for="p in packs" :key="p.id" class="ui-row">
          <span class="ui-thumb"><Icon name="solar:star-bold-duotone" class="ic ui-gem" /></span>
          <span class="ui-row-main"><span class="ui-row-title">{{ p.label }}</span><span class="ui-row-sub">+{{ p.gems }} Étoiles</span></span>
          <button class="ui-btn ui-btn--primary ui-btn--sm" @click="buyPack(p)">{{ p.priceLabel }}</button>
        </div>
      </div>
    </section>

    <!-- ============ FICHE D'UN VÊTEMENT ============ -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="detail && !trying" class="modal" @click.self="closeDetail">
          <div class="sheet-card" role="dialog" aria-modal="true" :aria-label="detailItem.label">
            <div class="ui-grab" />
            <button class="ui-icon-btn ui-icon-btn--sm x" aria-label="Fermer" @click="closeDetail"><Icon name="solar:close-circle-bold" class="ic" /></button>

            <div class="hero" :class="{ party: celebrate }" :style="{ '--ink': inkFor(detail.color) }">
              <span class="hero-glow" />
              <Icon :name="itemIcon(detailItem.id)" class="hero-ic" />
              <template v-if="celebrate">
                <span v-for="k in CONFETTI" :key="k.i" class="confetti" :style="{ '--x': k.x + 'px', '--y': k.y + 'px', '--c': k.c, '--rot': k.r + 'deg', '--d': k.d + 's' }" />
              </template>
            </div>

            <h3 class="ui-dialog-title d-title">{{ detailItem.label }} <span class="d-color">{{ colorLabel(detail.color) }}</span></h3>
            <p class="d-sub">
              <span class="ui-tag" :style="{ '--c': RARITIES[detailItem.rarity].color }">{{ RARITIES[detailItem.rarity].label }}</span>
              <span class="ui-tag">{{ SLOT_LABELS[detailItem.slot] }}</span>
              <span v-if="detailSet" class="ui-tag">Collection {{ detailSet.label }}</span>
            </p>

            <!-- pastilles de couleur -->
            <div class="ui-swatches" role="radiogroup" aria-label="Couleur">
              <button
                v-for="k in detailColors"
                :key="k"
                class="ui-swatch"
                :class="{ 'is-on': detail.color === k, 'is-off': COLORS[k].premium && !starsOpen }"
                role="radio"
                :aria-checked="detail.color === k"
                :aria-label="colorLabel(k) + (inv.ownsColor(detailItem.id, k) ? ' (possédée)' : '')"
                :style="{ background: swatchBg(k) }"
                @click="pickColor(k)"
              >
                <Icon v-if="inv.ownsColor(detailItem.id, k)" name="solar:check-circle-bold" class="ui-swatch-mark" />
                <Icon v-else-if="COLORS[k].premium" name="solar:star-bold-duotone" class="ui-swatch-mark is-gem" />
                <Icon v-if="tasteMark(k)" :name="tasteMark(k)" class="ui-swatch-mark is-tl" />
              </button>
            </div>
            <p class="ui-caption center-txt">{{ ownedColorCount }} / {{ detailColors.length }} couleurs dans ton Sac</p>

            <p v-if="tasteHint" class="ui-note" :class="tasteHint.kind === 'love' ? 'ui-note--love' : 'ui-note--violet'">
              <Icon :name="tasteHint.icon" class="ic" />{{ tasteHint.text }}
            </p>
            <p v-if="buyError" class="err" :class="{ shake: shakeKey }">{{ buyError }}</p>

            <div class="ui-actions">
              <button v-if="canTry" class="ui-btn ui-btn--secondary try" @click="startTry"><Icon name="solar:eye-bold-duotone" class="ic" />Essayer</button>
              <template v-if="inv.ownsColor(detailItem.id, detail.color)">
                <button v-if="isWorn" class="ui-btn is-done" disabled><Icon name="solar:check-circle-bold" class="ic" />Elle le porte</button>
                <button v-else class="ui-btn ui-btn--primary" @click="wear"><Icon name="solar:hanger-bold-duotone" class="ic" />Lui mettre</button>
              </template>
              <button v-else-if="detailLock" class="ui-btn is-done" disabled><Icon name="solar:lock-keyhole-bold" class="ic" />{{ detailLock }}</button>
              <button v-else class="ui-btn ui-btn--primary" :class="{ 'is-poor': !inv.canAfford(detailPrice) }" @click="buy">
                <span>Acheter</span>
                <span class="ui-price">
                  <s v-if="detailDiscount" class="was">{{ detailBase.amount }}</s>
                  <Icon :name="curIcon(detailPrice.currency)" class="ic" :class="detailPrice.currency" />{{ detailPrice.amount }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- barre d'essayage : la fiche s'efface pour la voir en 3D -->
      <Transition name="slide">
        <div v-if="trying && detail" ref="tryBar" class="try-bar" role="dialog" aria-label="Essayage">
          <div class="ui-kicker try-head">
            <Icon name="solar:eye-bold-duotone" class="ic" />
            <span>Essayage · {{ detailItem.label }} {{ colorLabel(detail.color) }}</span>
          </div>
          <div class="ui-swatches tight">
            <button
              v-for="k in detailColors"
              :key="k"
              class="ui-swatch"
              :class="{ 'is-on': detail.color === k, 'is-off': COLORS[k].premium && !starsOpen }"
              :aria-label="colorLabel(k)"
              :style="{ background: swatchBg(k) }"
              @click="pickColor(k)"
            >
              <Icon v-if="inv.ownsColor(detailItem.id, k)" name="solar:check-circle-bold" class="ui-swatch-mark" />
            </button>
          </div>
          <div class="ui-actions">
            <button class="ui-btn ui-btn--secondary" @click="stopTry()">Retirer</button>
            <button v-if="inv.ownsColor(detailItem.id, detail.color)" class="ui-btn ui-btn--primary" @click="wearFromTry">Lui mettre</button>
            <button v-else-if="!detailLock" class="ui-btn ui-btn--primary" :class="{ 'is-poor': !inv.canAfford(detailPrice) }" @click="buyFromTry">
              Acheter <span class="ui-price"><Icon :name="curIcon(detailPrice.currency)" class="ic" :class="detailPrice.currency" />{{ detailPrice.amount }}</span>
            </button>
            <button v-else class="ui-btn is-done" disabled>{{ detailLock }}</button>
          </div>
        </div>
      </Transition>

      <!-- coffre du jour -->
      <Transition name="pop">
        <div v-if="chest.phase !== 'idle'" class="ui-scrim" @click.self="chest.phase === 'open' && closeChest()">
          <div class="ui-dialog chest-card" role="dialog" aria-modal="true" aria-label="Coffre du jour">
            <div class="chest-stage" :class="chest.phase">
              <span class="rays" />
              <Icon name="solar:gift-bold-duotone" class="big-gift" />
              <template v-if="chest.phase === 'open'">
                <span v-for="k in CONFETTI" :key="k.i" class="confetti" :style="{ '--x': k.x * 1.3 + 'px', '--y': k.y * 1.3 + 'px', '--c': k.c, '--rot': k.r + 'deg', '--d': k.d + 's' }" />
              </template>
            </div>
            <template v-if="chest.phase === 'open' && chest.result">
              <p class="ui-kicker">Dans le coffre…</p>
              <div class="loot">
                <template v-if="chest.result.kind === 'item'">
                  <span class="ui-thumb ui-thumb--lg loot-art" :style="{ '--ink': inkFor(chest.result.item.color) }"><Icon :name="itemIcon(chest.result.item.id)" class="ic art-ic" /></span>
                  <strong class="ui-dialog-title">{{ chest.result.label }}</strong>
                </template>
                <template v-else-if="chest.result.kind === 'ingredients'">
                  <span class="loot-foods">
                    <span v-for="(q, id) in chest.result.ingredients" :key="id" class="loot-food"><FoodImg :id="id" :emoji="ingredientById(id)?.emoji" /><small>×{{ q }}</small></span>
                  </span>
                  <strong class="ui-dialog-title">{{ chest.result.label }}</strong>
                </template>
                <template v-else>
                  <span class="ui-thumb ui-thumb--lg loot-art"><Icon :name="curIcon('coins')" class="ic ui-coin" /></span>
                  <strong class="ui-dialog-title">+{{ chest.result.coins }} pièces</strong>
                </template>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--block" @click="closeChest">Super !</button>
              <p class="ui-caption">Un nouveau coffre gratuit t'attend demain.</p>
            </template>
            <template v-else-if="chest.phase === 'shake'">
              <p class="ui-dialog-title">Qu'y a-t-il dedans ?</p>
            </template>
            <template v-else-if="chest.phase === 'later'">
              <p class="ui-dialog-title">Déjà ouvert aujourd'hui</p>
              <p class="ui-text">Reviens demain : il sera de nouveau plein !</p>
              <button class="ui-btn ui-btn--primary ui-btn--block" @click="closeChest">D'accord</button>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { gameToast } from "~/composables/useCreatureMood";
import {
  SLOTS, SLOT_LABELS, SLOT_ICONS, COLORS, RARITIES, V1_ITEMS, V1_INGREDIENTS, PROPS,
  itemById, setById, itemColors, priceFor, groceryIngredients, ingredientById, propById, activityById,
} from "~/lib/catalog";
import { itemIcon, swatchBg, inkFor } from "~/lib/itemIcons";
import { purchasesTestMode, visiblePacks, buyGemPack } from "~/lib/payments";
import { useOutfitPreview } from "~/composables/useOutfit";

const props = defineProps({
  // onglet initial : "vetements" | "epicerie" | "objets" (| "etoiles" en mode test)
  tab: { type: String, default: "vetements" },
  // élément à mettre en avant : id d'un vêtement (ouvre sa fiche), d'un ingrédient ou d'un objet
  focus: { type: String, default: "" },
  // couleur à présélectionner dans la fiche du vêtement mis en avant
  focusColor: { type: String, default: "" },
  // rayon ouvert d'emblée (depuis un sous-menu du Sac : Tête, Cou...)
  slotKey: { type: String, default: "" },
});
// navigate : { to: "cuisine" | "sac", tab? } ; tryon : true pendant l'essayage (la fiche est masquée)
const emit = defineEmits(["navigate", "tryon"]);

const inv = useInventoryStore();
const store = useTamagotchiStore();
const root = ref(null);

inv.ensureShop();

const has = (k) => !!store.hasFeature?.(k);
const starsOpen = computed(() => has("etoiles") || inv.gems > 0);
const curIcon = (cur) => (cur === "gems" ? "solar:star-bold-duotone" : "mochi:coin");
const colorLabel = (k) => (COLORS[k]?.label || k).toLowerCase();
const basePrice = (id, color) => priceFor(id, color, inv.owned[id] || []);

// objets (avant les onglets : le rayon Objets n'apparaît que s'il y a quelque chose à acheter)
const propRows = computed(() => PROPS.map((p) => {
  const act = activityById(p.activity);
  if (p.soon) return { prop: p, state: "soon", sub: "Bientôt !" };
  if (inv.hasProp(p.id)) return { prop: p, state: "owned", sub: act ? `Pour : ${act.label.toLowerCase()}` : "" };
  if (act?.feature && !has(act.feature)) return { prop: p, state: "locked", sub: "Elle le découvrira en grandissant" };
  return { prop: p, state: "buy", sub: act ? `Pour : ${act.label.toLowerCase()}` : "" };
}));
// ---------- onglets ----------
const testMode = purchasesTestMode();
// un rayon n'apparaît que lorsqu'il sert : l'épicerie avec la cuisine, les objets s'il y a
// quelque chose à acheter (ils sont sinon offerts à la découverte de l'activité)
const tabs = computed(() => [
  { key: "vetements", label: "Vêtements", icon: "solar:t-shirt-bold-duotone" },
  has("cuisine") ? { key: "epicerie", label: "Épicerie", icon: "solar:cart-large-2-bold-duotone" } : null,
  propRows.value.some((p) => p.state === "buy") ? { key: "objets", label: "Objets", icon: "solar:box-bold-duotone" } : null,
  testMode ? { key: "etoiles", label: "Test", icon: "solar:star-bold-duotone" } : null,
].filter(Boolean));
const validTab = (t) => (tabs.value.some((x) => x.key === t) ? t : "vetements");
const tab = ref(validTab(props.tab));

// ---------- vêtements ----------
const slotFilter = ref(SLOTS.includes(props.slotKey) ? props.slotKey : "all");
watch(() => props.slotKey, (k) => { if (SLOTS.includes(k)) slotFilter.value = k; });
const slotChips = [{ key: "all", label: "Tout" }, ...SLOTS.map((s) => ({ key: s, label: SLOT_LABELS[s], icon: SLOT_ICONS[s] }))];
const daily = computed(() => inv.dailyColor);
const dailyItem = computed(() => (daily.value ? itemById(daily.value.itemId) : null));

function shortLock(item, lock) {
  if (!lock) return "";
  if ((store.topLevel || store.level) < item.minLevel) return `Niveau ${item.minLevel}`;
  return lock;
}
// prix « dès » : la couleur la moins chère qu'elle n'a pas encore (pièces avant Étoiles)
function fromPrice(item) {
  let best = null;
  for (const k of itemColors(item)) {
    if (inv.ownsColor(item.id, k)) continue;
    if (COLORS[k].premium && !starsOpen.value && !item.premium) continue;
    const p = inv.itemPrice(item.id, k);
    if (!best || (p.currency === "coins" && best.currency === "gems") || (p.currency === best.currency && p.amount < best.amount)) best = p;
  }
  return best || { currency: item.premium ? "gems" : "coins", amount: 0 };
}
const cards = computed(() => {
  const list = V1_ITEMS
    .filter((i) => slotFilter.value === "all" || i.slot === slotFilter.value)
    .filter((i) => !i.premium || starsOpen.value)
    .map((item) => {
      const colors = itemColors(item);
      const mine = colors.filter((k) => inv.ownsColor(item.id, k));
      const lock = inv.itemLock(item.id);
      const isDaily = daily.value?.itemId === item.id && !inv.ownsColor(item.id, daily.value.color);
      return {
        item, colors, lock, lockShort: shortLock(item, lock),
        have: mine.length, total: colors.length,
        color: isDaily ? daily.value.color : mine[0] || colors.find((k) => !COLORS[k].premium) || colors[0],
        from: fromPrice(item), isDaily, isNew: inv.isNew(item.id),
      };
    });
  // débloqués d'abord, puis par niveau et par prix ; items Étoiles à la fin
  return list.sort((a, b) => (!!a.lock - !!b.lock) || (!!a.item.premium - !!b.item.premium)
    || (a.item.minLevel - b.item.minLevel) || (a.item.price - b.item.price));
});

// ---------- fiche ----------
const detail = ref(null); // { id, color }
const celebrate = ref(false);
const reactionLine = ref("");
const buyError = ref("");
const shakeKey = ref(0);
const detailItem = computed(() => (detail.value ? itemById(detail.value.id) : null));
const detailColors = computed(() => (detailItem.value ? itemColors(detailItem.value) : []));
const detailSet = computed(() => (detailItem.value?.set ? setById(detailItem.value.set) : null));
const detailPrice = computed(() => (detail.value ? inv.itemPrice(detail.value.id, detail.value.color) : { currency: "coins", amount: 0 }));
const detailBase = computed(() => (detail.value ? basePrice(detail.value.id, detail.value.color) : { currency: "coins", amount: 0 }));
const detailDiscount = computed(() => detailBase.value.amount > detailPrice.value.amount);
const ownedColorCount = computed(() => detailColors.value.filter((k) => inv.ownsColor(detail.value.id, k)).length);
const isWorn = computed(() => {
  const cur = detailItem.value && inv.outfit[detailItem.value.slot];
  return !!cur && cur.id === detail.value.id && cur.color === detail.value.color;
});
const detailLock = computed(() => {
  if (!detailItem.value) return "";
  const lock = inv.itemLock(detailItem.value.id);
  if (lock) return shortLock(detailItem.value, lock);
  if (detailPrice.value.currency === "gems" && !starsOpen.value) return "Étoiles bientôt";
  return "";
});

// goûts déjà découverts : cœur sur sa couleur préférée, cœur brisé sur celle qu'elle n'aime pas
const tastes = computed(() => store.tastes || {});
function tasteMark(k) {
  if (k === tastes.value.color && inv.isTasteSeen("color")) return "solar:heart-bold-duotone";
  if (k === tastes.value.colorDislike && inv.isTasteSeen("colorDislike")) return "solar:heart-broken-bold-duotone";
  return "";
}
const tasteHint = computed(() => {
  if (!detail.value) return null;
  const t = tastes.value;
  const id = detail.value.id, k = detail.value.color;
  if (id === t.itemLove && inv.isTasteSeen("itemLove")) return { kind: "love", icon: "solar:heart-bold-duotone", text: "Son accessoire chouchou !" };
  if (id === t.itemDislike && inv.isTasteSeen("itemDislike")) return { kind: "dislike", icon: "solar:heart-broken-bold-duotone", text: "Elle n'aime pas trop ça…" };
  if (k === t.color && inv.isTasteSeen("color")) return { kind: "love", icon: "solar:heart-bold-duotone", text: "Sa couleur préférée !" };
  if (k === t.colorDislike && inv.isTasteSeen("colorDislike")) return { kind: "dislike", icon: "solar:heart-broken-bold-duotone", text: "Une couleur qu'elle boude." };
  return null;
});

function openDetail(id, color) {
  const item = itemById(id);
  if (!item) return;
  const colors = itemColors(item);
  const mine = colors.filter((k) => inv.ownsColor(id, k));
  const pick = colors.includes(color) ? color
    : colors.find((k) => !mine.includes(k) && (!COLORS[k].premium || starsOpen.value)) || mine[0] || colors[0];
  detail.value = { id, color: pick };
  celebrate.value = false;
  reactionLine.value = "";
  buyError.value = "";
  if (inv.isNew(id)) inv.markSeen(mine.map((k) => `${id}:${k}`));
}
function closeDetail() {
  if (trying.value) stopTry();
  detail.value = null;
}
function pickColor(k) {
  if (!detail.value) return;
  detail.value = { ...detail.value, color: k };
  buyError.value = "";
  reactionLine.value = "";
  celebrate.value = false;
  if (trying.value) { preview(); store.countEvent?.("essayage:couleur"); }
}

function buzz(pattern) {
  try {
    const v = localStorage.getItem("tamagotchi-haptics");
    if (v === "0" || v === "false" || v === "off") return;
  } catch { /* stockage indisponible */ }
  try { navigator.vibrate?.(pattern); } catch { /* non supporté */ }
}
function fail(reason) {
  buyError.value = reason || "Impossible pour le moment.";
  shakeKey.value++;
  buzz(30);
}
function buy() {
  if (!detail.value) return false;
  const { id, color } = detail.value;
  if (detailLock.value) return fail(detailLock.value);
  const res = inv.buyItem(id, color);
  if (!res.ok) {
    const need = res.price && res.price.currency === "coins" ? res.price.amount - inv.coins : 0;
    return fail(need > 0 ? `${res.reason} Encore ${need} à gagner en jouant avec elle !` : res.reason);
  }
  buyError.value = "";
  celebrate.value = false;
  requestAnimationFrame(() => (celebrate.value = true));
  inv.markSeen(`${id}:${color}`);
  buzz([20, 40, 20]);
  gameToast(`${itemById(id).label} ${colorLabel(color)} rejoint ton Sac !`, "solar:bag-4-bold-duotone");
  return true;
}
function wear() {
  if (!detail.value) return false;
  const item = itemById(detail.value.id);
  const r = inv.equip(item.slot, item.id, detail.value.color);
  if (!r) { fail("Impossible de lui mettre pour le moment."); return false; }
  reactionLine.value = r.reaction?.line || "";
  buzz(15);
  return true;
}
// depuis l'essayage : acheté (ou déjà à elle) = on le lui met et on revient à l'écran d'accueil pour la voir.
// L'équipement passe avant la fin de l'aperçu : la tenue portée contient déjà l'article.
function finishTry() {
  stopTry();
  detail.value = null;
  closePage();
}
function buyFromTry() {
  if (!buy()) { stopTry(); return; } // échec (pas assez de pièces...) : la fiche réapparaît avec la raison
  wear();
  finishTry();
}
function wearFromTry() {
  if (wear()) finishTry();
  else stopTry();
}

// ---------- essayage gratuit (aperçu 3D, sans acheter) ----------
// useOutfitPreview agit sur la créature habillée par bindOutfit (Tamagotchi.vue)
const outfitPreview = useOutfitPreview();
const canTry = computed(() => !!detail.value && !!outfitPreview.creature.value);
const trying = ref(false);
const tryBar = ref(null);
let hiddenOverlay = null;

function preview() {
  if (!detail.value) return false;
  const item = itemById(detail.value.id);
  try {
    return outfitPreview.preview({ [item.slot]: { id: item.id, color: detail.value.color } });
  } catch { return false; }
}
function startTry() {
  if (!preview()) {
    gameToast("L'essayage n'est pas disponible pour le moment.", "solar:eye-bold-duotone");
    return;
  }
  trying.value = true;
  gameBus.trying = true;
  store.countEvent?.("essayage");
  emit("tryon", true);
  // on efface la fenêtre de la boutique pour la voir en 3D
  hiddenOverlay = root.value?.closest(".overlay") || null;
  if (hiddenOverlay) hiddenOverlay.classList.add("shop-trying");
  // la créature se recadre au-dessus de la barre d'essayage (app.vue lit gameBus.tryTop)
  nextTick(() => {
    const top = tryBar.value?.getBoundingClientRect().top;
    if (trying.value && top) gameBus.tryTop = Math.round(top);
  });
}
function stopTry() {
  if (!trying.value) return;
  trying.value = false;
  gameBus.trying = false;
  gameBus.tryTop = 0;
  emit("tryon", false);
  if (hiddenOverlay) hiddenOverlay.classList.remove("shop-trying");
  hiddenOverlay = null;
  // après achat + équipement, la tenue portée contient déjà l'article
  try { outfitPreview.endPreview(); } catch { /* la scène se remettra à jour avec la tenue */ }
}

// ---------- épicerie ----------
const groceries = computed(() => groceryIngredients(has("collection")));
const groceriesSoon = computed(() => V1_INGREDIENTS.filter((i) => !groceries.value.includes(i)));
const qty = reactive({});
const qtyOf = (id) => qty[id] || 1;
const setQty = (id, d) => { qty[id] = Math.max(1, Math.min(9, qtyOf(id) + d)); };
const floats = ref([]);
let floatId = 0;
function buyIng(ing) {
  const n = qtyOf(ing.id);
  const res = inv.buyIngredient(ing.id, n);
  if (!res.ok) {
    gameToast(res.reason === "Pas assez de pièces." ? "Pas assez de pièces : joue avec elle pour en gagner !" : res.reason, "solar:cart-large-2-bold-duotone");
    buzz(30);
    return;
  }
  buzz(12);
  const fid = ++floatId;
  floats.value.push({ id: fid, key: ing.id, n });
  setTimeout(() => (floats.value = floats.value.filter((f) => f.id !== fid)), 900);
  qty[ing.id] = 1;
}

// ---------- objets ----------

function buyPropRow(p) {
  const res = inv.buyProp(p.id);
  if (!res.ok) { gameToast(res.reason, p.icon); buzz(30); return; }
  buzz([20, 40, 20]);
  gameToast(`${p.label} : il t'attend dans le pré !`, p.icon);
}

// ---------- mode test ----------
const packs = computed(() => visiblePacks());
async function buyPack(p) {
  const r = await buyGemPack(p.id);
  if (!r.ok) gameToast(r.reason, "solar:star-bold-duotone");
}

// ---------- coffre gratuit ----------
const chest = reactive({ phase: "idle", result: null });
let chestTimer = 0;
function openChest() {
  if (!inv.chestReady) { chest.phase = "later"; return; }
  chest.phase = "shake";
  chest.result = null;
  buzz([10, 30, 10, 30, 10]);
  chestTimer = setTimeout(() => {
    const r = inv.claimChest();
    if (!r.ok) { chest.phase = "later"; return; }
    chest.result = r;
    chest.phase = "open";
    buzz([20, 40, 20]);
  }, 1100);
}
function closeChest() {
  clearTimeout(chestTimer);
  chest.phase = "idle";
  chest.result = null;
}

// confettis : positions fixes (aucun calcul par image)
const CONFETTI = [
  { i: 0, x: -90, y: -70, c: "#ff6b8a", r: 200, d: 0 },
  { i: 1, x: 80, y: -90, c: "#ffd23f", r: -160, d: 0.03 },
  { i: 2, x: -60, y: -110, c: "#4cbf4b", r: 120, d: 0.06 },
  { i: 3, x: 100, y: -40, c: "#3b7ddd", r: -240, d: 0.02 },
  { i: 4, x: -110, y: -20, c: "#9b6be0", r: 300, d: 0.05 },
  { i: 5, x: 40, y: -120, c: "#ff8f3c", r: -90, d: 0.08 },
  { i: 6, x: -20, y: -95, c: "#7fe0c2", r: 180, d: 0.1 },
  { i: 7, x: 120, y: -100, c: "#ff6b8a", r: -300, d: 0.07 },
  { i: 8, x: -125, y: -85, c: "#ffd23f", r: 260, d: 0.04 },
  { i: 9, x: 60, y: -20, c: "#4cbf4b", r: -200, d: 0.09 },
];

// ---------- mise en avant (props.focus) ----------
const focusId = ref("");
async function applyFocus() {
  const id = props.focus;
  if (!id) return;
  if (itemById(id)) {
    tab.value = "vetements";
    openDetail(id, props.focusColor);
    return;
  }
  if (ingredientById(id)) tab.value = validTab("epicerie");
  else if (propById(id)) tab.value = "objets";
  else return;
  focusId.value = id;
  await nextTick();
  document.getElementById("shop-" + id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  setTimeout(() => { if (focusId.value === id) focusId.value = ""; }, 2200);
}
watch(() => props.tab, (t) => { tab.value = validTab(t); });
watch(() => [props.focus, props.focusColor], applyFocus);
onMounted(applyFocus);
onBeforeUnmount(() => {
  stopTry();
  clearTimeout(chestTimer);
});
</script>

<style scoped>
.top { display: flex; align-items: center; justify-content: space-between; gap: var(--s-2); }
.center { justify-self: center; }
.center-txt { text-align: center; }

/* coffre du jour : petit bouton, doré seulement quand il est prêt */
.chest-btn { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px 0 10px; border: 0; border-radius: var(--r-pill); background: var(--surface); box-shadow: var(--ui-soft); color: var(--hud-ink-2); font: 800 var(--t-md) / 1 var(--font-text); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.35s var(--spring-strong); }
.chest-btn:active { transform: scale(0.94); }
.chest-btn .chest-ic { width: 24px; height: 24px; color: var(--hud-ink-2); }
.chest-btn.ready { color: var(--coin-ink); background: linear-gradient(180deg, color-mix(in srgb, #fff6dc var(--tint), var(--surface)), color-mix(in srgb, #ffe6a8 var(--tint), var(--surface))); box-shadow: 0 4px 12px rgba(240, 170, 40, 0.28); }
.ready .chest-ic { color: var(--warn); animation: wobble 1.8s ease-in-out infinite; }
.chest-btn .ui-dot { top: 4px; right: 4px; }
@keyframes wobble {
  0%, 70%, 100% { transform: rotate(0); }
  76% { transform: rotate(-14deg) scale(1.08); }
  82% { transform: rotate(12deg) scale(1.08); }
  88% { transform: rotate(-8deg); }
  94% { transform: rotate(5deg); }
}

/* catégories : rangée d'icônes (la sélection = aplat bleu ciel) */
.cats { display: flex; gap: 8px; overflow-x: auto; margin: -6px -16px; padding: 6px 16px 10px; scrollbar-width: none; }
.cats::-webkit-scrollbar { display: none; }
.cat { flex: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 60px; min-height: 56px; padding: 6px 10px; border: 0; border-radius: var(--r-md); background: var(--surface); box-shadow: var(--ui-soft); color: var(--hud-ink); font: 800 var(--t-xs) / 1 var(--font-text); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.38s var(--spring-strong), background 0.2s, color 0.2s; }
.cat .ic { width: 24px; height: 24px; color: var(--sky); }
.cat:active { transform: scale(0.93); }
.cat.is-on { background: var(--ui-on-bg); box-shadow: var(--ui-on-shadow); color: #fff; }
.cat.is-on .ic { color: #fff; }

/* grille d'articles : cartes blanches, une grande image, le nom, un prix */
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (min-width: 440px) { .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.grid > * { animation: rise 0.45s var(--spring) calc(var(--i, 0) * 35ms) both; }
@keyframes rise { from { opacity: 0; transform: translateY(14px) scale(0.94); } to { opacity: 1; transform: none; } }

.item { position: relative; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px 12px; border: 0; border-radius: var(--r-lg); background: var(--surface); box-shadow: var(--ui-soft); color: var(--hud-ink); font: inherit; text-align: center; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.38s var(--spring-strong); }
.item:active { transform: scale(0.95); }
.art { position: relative; display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, var(--surface), color-mix(in srgb, var(--ink) 12%, var(--surface-2)) 100%); }
.art-ic { width: 56px; height: 56px; color: var(--ink); filter: var(--item-rim) drop-shadow(0 2px 2px rgba(40, 55, 80, 0.22)); }
.item.locked .art-ic { opacity: 0.35; filter: grayscale(0.7); }
.art-lock { position: absolute; right: -2px; bottom: -2px; width: 26px; height: 26px; padding: 4px; border-radius: 50%; background: var(--surface); color: var(--hud-ink-2); box-shadow: var(--ui-soft); }
.name { max-width: 100%; min-height: 2.3em; display: grid; place-items: center; font: 800 var(--t-md) / 1.15 var(--font-text); color: var(--hud-ink); overflow-wrap: anywhere; }
.meta { display: flex; align-items: center; justify-content: center; min-height: 24px; }
.ui-price.small { font-size: var(--t-lg); color: var(--hud-ink); }
.ui-price.small .ic { width: 20px; height: 20px; }
.soon { font: 700 var(--t-sm) / 1.2 var(--font-text); color: var(--hud-ink-2); }
.promo { position: absolute; top: 8px; left: 8px; padding: 3px 8px; border-radius: var(--r-pill); background: var(--warn); color: #fff; font: 800 var(--t-xs) / 1.2 var(--font-text); }
.owned { position: absolute; top: 8px; right: 8px; display: grid; }
.owned .ic { width: 22px; height: 22px; color: var(--accent-lo); }
.item .ui-dot { top: 8px; right: 8px; left: auto; }

/* offre du jour : une rangée discrète, première de la grille */
.offer { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 8px 14px 8px 10px; border: 0; border-radius: var(--r-lg); background: var(--surface); box-shadow: var(--ui-soft); color: var(--hud-ink); font: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.38s var(--spring-strong); }
.offer:active { transform: scale(0.97); }
.offer-art { flex: none; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: radial-gradient(circle at 50% 35%, var(--surface), color-mix(in srgb, var(--ink) 14%, var(--surface-2))); }
.offer-ic { width: 32px; height: 32px; color: var(--ink); filter: var(--item-rim); }
.offer-main { flex: 1; min-width: 0; display: grid; gap: 3px; }
.offer-kicker { font: 800 var(--t-xs) / 1 var(--font-text); letter-spacing: 0.04em; text-transform: uppercase; color: var(--warn-ink); }
.offer-title { font: 800 var(--t-md) / 1.15 var(--font-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.offer-end { flex: none; display: grid; justify-items: end; gap: 3px; color: var(--hud-ink); font: 800 var(--t-sm) var(--font-text); }
.offer-end .ic { width: 18px; height: 18px; }
.offer-badge { padding: 2px 7px; border-radius: var(--r-pill); background: var(--warn); color: #fff; font: 800 var(--t-xs) / 1.2 var(--font-text); }
.offer .ui-price { font-size: var(--t-md); }

/* lignes (épicerie, objets) */
.ui-row { transition: box-shadow 0.3s; }
.ui-row.focus { box-shadow: 0 0 0 3px #ffc21a, var(--sh-2); }
.stepper { flex: none; display: inline-flex; align-items: center; }
.step { display: grid; place-items: center; width: 34px; height: var(--tap); padding: 0; border: 0; background: none; color: var(--accent); cursor: pointer; }
.step:disabled { color: var(--ink-4); opacity: 0.6; cursor: default; }
.step-ic { width: 28px; height: 28px; }
.qty { min-width: 16px; text-align: center; font-size: 17px; font-weight: 700; }
.float { position: absolute; right: 26px; top: 0; padding: 2px 8px; border-radius: var(--r-pill); background: var(--surface); color: var(--accent-ink); font: 800 var(--t-md) var(--font-title); box-shadow: var(--sh-1); pointer-events: none; animation: up 0.9s ease-out forwards; }
@keyframes up { 0% { transform: translateY(6px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-30px); opacity: 0; } }

/* fiche (téléportée) : même feuille que BaseSheet */
.modal { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-end; justify-content: center; background: var(--scrim); }
.sheet-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 92%;
  overflow-y: auto;
  display: grid;
  gap: 10px;
  padding: 10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);
  border-radius: 32px 32px 0 0;
  background: linear-gradient(180deg, var(--surface) 60%, var(--plate-hi));
  color: var(--ink);
  box-shadow: 0 -10px 40px rgba(30, 15, 50, 0.3), inset 0 2px 0 var(--glint);
}
.sheet-card .ui-grab { margin-bottom: 0; }
.x { position: absolute; top: 14px; right: 14px; z-index: 2; }
.hero { position: relative; display: grid; place-items: center; height: 140px; }
.hero-glow { position: absolute; width: 136px; height: 136px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--ink) 22%, var(--surface)) 0%, var(--surface) 70%); }
.hero-ic { position: relative; width: 100px; height: 100px; color: var(--ink); filter: var(--item-rim) drop-shadow(0 6px 6px rgba(40, 55, 80, 0.22)); transition: color 0.25s; }
.hero.party .hero-ic { animation: boing 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes boing { 0% { transform: scale(0.6) rotate(-10deg); } 60% { transform: scale(1.18) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
.confetti { position: absolute; left: 50%; top: 55%; width: 10px; height: 14px; border-radius: 3px; background: var(--c); opacity: 0; animation: confetti 1.1s ease-out var(--d) forwards; }
@keyframes confetti {
  0% { transform: translate(-50%, 0) rotate(0) scale(0.5); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(var(--y) + 60px)) rotate(var(--rot)) scale(1); opacity: 0; }
}
.d-title { text-align: center; }
.d-color { color: var(--ink-3); font-weight: 600; }
.d-sub { margin: 0; display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; }
.ui-note { justify-content: center; }
.err { margin: 0; text-align: center; font: 800 var(--t-md)/1.35 var(--font-text); color: var(--danger); }
.shake { animation: shake 0.35s; }
@keyframes shake { 25% { transform: translateX(-6px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-3px); } }
.ui-actions .try { flex: 0 0 auto; }

/* barre d'essayage */
.try-bar {
  position: fixed;
  left: 50%;
  bottom: calc(var(--nav-h, 78px) + env(safe-area-inset-bottom, 0px) + 10px);
  z-index: 40;
  width: min(460px, calc(100% - 24px));
  transform: translateX(-50%);
  display: grid;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-lg);
  background: var(--surface);
  color: var(--ink);
  box-shadow: var(--sh-3);
}
.try-head span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-transform: none; letter-spacing: 0; font-size: var(--t-md); }
.ui-swatches.tight { gap: 10px; padding: 2px 0; }

/* coffre (modale) */
.chest-stage { position: relative; display: grid; place-items: center; width: 180px; height: 150px; }
.big-gift { position: relative; width: 116px; height: 116px; color: var(--warn); filter: drop-shadow(0 8px 8px rgba(160, 80, 0, 0.25)); }
.shake .big-gift { animation: chestShake 0.5s ease-in-out infinite; }
.open .big-gift { animation: chestPop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) forwards; }
.rays { position: absolute; inset: -20px; border-radius: 50%; opacity: 0; background: repeating-conic-gradient(from 0deg, rgba(255, 200, 60, 0.35) 0 12deg, transparent 12deg 30deg); }
.open .rays { opacity: 1; animation: spin 6s linear infinite; -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); }
@keyframes chestShake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg) translateY(-3px); } 75% { transform: rotate(10deg) translateY(-3px); } }
@keyframes chestPop { 0% { transform: scale(1); } 40% { transform: scale(1.3) translateY(-10px); } 100% { transform: scale(0.8) translateY(18px); opacity: 0.5; } }
@keyframes spin { to { transform: rotate(360deg); } }
.loot { display: grid; gap: var(--s-2); justify-items: center; animation: boing 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
.loot-art { width: 84px; height: 84px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, var(--surface), var(--surface-2)); }
.loot-art .ic { width: 54px; height: 54px; }
.loot-foods { display: flex; gap: var(--s-2); font-size: 40px; }
.loot-food small { font: 800 var(--t-md) var(--font-text); color: var(--ink-2); }

/* transitions */
.pop-enter-active, .pop-leave-active { transition: opacity 0.2s; }
.pop-enter-active .sheet-card, .pop-leave-active .sheet-card { transition: transform 0.3s cubic-bezier(0.3, 1.2, 0.5, 1); }
.pop-enter-active .chest-card { transition: transform 0.35s cubic-bezier(0.3, 1.5, 0.5, 1); }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .sheet-card, .pop-leave-to .sheet-card { transform: translateY(100%); }
.pop-enter-from .chest-card { transform: scale(0.7); }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s cubic-bezier(0.3, 1.2, 0.5, 1), opacity 0.2s; }
.slide-enter-from, .slide-leave-to { transform: translate(-50%, 40px); opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .grid > *, .ready .chest-ic, .shake .big-gift, .open .rays, .hero.party .hero-ic, .loot { animation: none; }
  .confetti { display: none; }
}
</style>

<style>
/* essayage : la fenêtre de la boutique s'efface pour laisser voir la créature en 3D */
.overlay.shop-trying { background: transparent !important; pointer-events: none; }
.overlay.shop-trying > .sheet { transform: translateY(110%); transition: transform 0.3s ease; }
</style>
