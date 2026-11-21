<template>
  <div ref="root" class="shop">
    <!-- porte-monnaie + coffre gratuit du jour -->
    <div class="top">
      <CurrencyBar />
      <button class="chest-btn" :class="{ ready: inv.chestReady }" :aria-label="inv.chestReady ? 'Ouvrir le coffre gratuit du jour' : 'Coffre déjà ouvert aujourd\'hui'" @click="openChest">
        <Icon name="solar:gift-bold-duotone" class="chest-ic" />
        <span class="chest-txt">{{ inv.chestReady ? "Coffre gratuit" : "Demain !" }}</span>
        <span v-if="inv.chestReady" class="chest-dot" aria-hidden="true" />
      </button>
    </div>

    <!-- onglets -->
    <nav v-if="tabs.length > 1" class="tabs" role="tablist" aria-label="Rayons de la boutique">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        class="tab"
        :class="{ on: tab === t.key }"
        :aria-selected="tab === t.key"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" class="tab-ic" />
        <span>{{ t.label }}</span>
      </button>
    </nav>

    <!-- ============ VÊTEMENTS ============ -->
    <section v-if="tab === 'vetements'" class="pane">
      <!-- coloris du jour : -30 %, sans minuteur -->
      <button v-if="dailyItem" class="daily" @click="openDetail(dailyItem.id, daily.color)">
        <span class="daily-art" :style="{ '--ink': inkFor(daily.color) }">
          <Icon :name="itemIcon(dailyItem.id)" class="daily-ic" />
        </span>
        <span class="daily-txt">
          <span class="daily-kicker"><Icon name="solar:sale-bold-duotone" class="kick-ic" />Coloris du jour</span>
          <strong>{{ dailyItem.label }} {{ colorLabel(daily.color) }}</strong>
          <span class="daily-price">
            <template v-if="inv.ownsColor(dailyItem.id, daily.color)">Déjà dans ton Sac</template>
            <template v-else>
              <s>{{ basePrice(dailyItem.id, daily.color).amount }}</s>
              <Icon :name="curIcon('coins')" class="mini-cur" />{{ inv.itemPrice(dailyItem.id, daily.color).amount }}
            </template>
          </span>
        </span>
        <span class="daily-badge">−{{ Math.round((daily.discount || 0) * 100) }} %</span>
      </button>

      <!-- filtre par emplacement -->
      <div class="chips" role="radiogroup" aria-label="Emplacement">
        <button v-for="s in slotChips" :key="s.key" class="chip" :class="{ on: slotFilter === s.key }" role="radio" :aria-checked="slotFilter === s.key" @click="slotFilter = s.key">
          <Icon v-if="s.icon" :name="s.icon" class="chip-ic" />{{ s.label }}
        </button>
      </div>

      <div class="grid">
        <button
          v-for="c in cards"
          :key="c.item.id"
          class="card item"
          :class="{ locked: !!c.lock, owned: c.have > 0, complete: c.have === c.total }"
          :aria-label="`${c.item.label}${c.lock ? ' (' + c.lock + ')' : ''}`"
          @click="openDetail(c.item.id)"
        >
          <span v-if="c.isNew" class="new" aria-hidden="true" />
          <span v-if="c.isDaily" class="tag sale">−30 %</span>
          <span v-else-if="c.item.rarity !== 'commun'" class="tag" :style="{ '--r': RARITIES[c.item.rarity].color }">{{ RARITIES[c.item.rarity].label }}</span>
          <span class="art" :style="{ '--ink': inkFor(c.color) }">
            <Icon :name="itemIcon(c.item.id)" class="art-ic" />
            <Icon v-if="c.lock" name="solar:lock-keyhole-bold" class="art-lock" />
          </span>
          <span class="name">{{ c.item.label }}</span>
          <span class="dots" aria-hidden="true">
            <span v-for="k in c.colors.slice(0, 7)" :key="k" class="dot" :class="{ have: inv.ownsColor(c.item.id, k) }" :style="{ background: swatchBg(k) }" />
          </span>
          <span class="meta">
            <template v-if="c.lock">{{ c.lockShort }}</template>
            <template v-else-if="c.have === c.total"><Icon name="solar:check-circle-bold" class="ok-ic" />Complet</template>
            <template v-else>
              <span v-if="c.have" class="have">{{ c.have }}/{{ c.total }} ·</span>
              <Icon :name="curIcon(c.from.currency)" class="mini-cur" :class="c.from.currency" />
              <span>{{ c.have ? "" : "dès " }}{{ c.from.amount }}</span>
            </template>
          </span>
        </button>
      </div>
      <p class="foot-note">Tous les vêtements qui comptent dans la collection s'achètent avec des pièces gagnées en jouant.</p>
    </section>

    <!-- ============ ÉPICERIE ============ -->
    <section v-else-if="tab === 'epicerie'" class="pane">
      <div class="rows">
        <div v-for="ing in groceries" :id="'shop-' + ing.id" :key="ing.id" class="card row" :class="{ focus: focusId === ing.id }">
          <span class="food">{{ ing.emoji }}</span>
          <span class="row-txt">
            <strong>{{ ing.label }}</strong>
            <span class="sub">Au frigo : {{ inv.pantry[ing.id] || 0 }}</span>
          </span>
          <span class="stepper" role="group" :aria-label="`Quantité de ${ing.label}`">
            <button class="step" aria-label="Moins" :disabled="qtyOf(ing.id) <= 1" @click="setQty(ing.id, -1)"><Icon name="solar:minus-circle-bold" class="step-ic" /></button>
            <span class="qty">{{ qtyOf(ing.id) }}</span>
            <button class="step" aria-label="Plus" :disabled="qtyOf(ing.id) >= 9" @click="setQty(ing.id, 1)"><Icon name="solar:add-circle-bold" class="step-ic" /></button>
          </span>
          <button class="buy small" :class="{ poor: inv.coins < ing.price * qtyOf(ing.id) }" @click="buyIng(ing)">
            <Icon :name="curIcon('coins')" class="mini-cur" />{{ ing.price * qtyOf(ing.id) }}
          </button>
          <span v-for="f in floats.filter((x) => x.key === ing.id)" :key="f.id" class="float">+{{ f.n }}</span>
        </div>
      </div>
      <p v-if="groceriesSoon.length" class="foot-note">D'autres ingrédients arriveront bientôt dans l'épicerie.</p>
      <button v-if="store.hasFeature?.('cuisine')" class="link" @click="emit('navigate', { to: 'cuisine' })">
        <Icon name="solar:chef-hat-bold-duotone" class="link-ic" />Aller cuisiner
      </button>
    </section>

    <!-- ============ OBJETS ============ -->
    <section v-else-if="tab === 'objets'" class="pane">
      <div class="rows">
        <div v-for="p in propRows.filter((r) => r.state === 'buy' || r.state === 'owned')" :id="'shop-' + p.prop.id" :key="p.prop.id" class="card row" :class="{ focus: focusId === p.prop.id }">
          <span class="prop-art"><Icon :name="p.prop.icon" class="prop-ic" /></span>
          <span class="row-txt">
            <strong>{{ p.prop.label }}</strong>
            <span class="sub">{{ p.sub }}</span>
          </span>
          <span v-if="p.state === 'owned'" class="owned-pill"><Icon name="solar:check-circle-bold" class="ok-ic" />Dans le pré</span>
          <button v-else-if="p.state === 'buy'" class="buy small" :class="{ poor: inv.coins < p.prop.price }" @click="buyPropRow(p.prop)">
            <template v-if="p.prop.price"><Icon :name="curIcon('coins')" class="mini-cur" />{{ p.prop.price }}</template>
            <template v-else>Gratuit</template>
          </button>
          <Icon v-else name="solar:lock-keyhole-bold" class="row-lock" />
        </div>
      </div>
      <p class="foot-note">Les objets d'activité sont offerts quand elle découvre une nouvelle activité.</p>
    </section>

    <!-- ============ ÉTOILES (mode test uniquement) ============ -->
    <section v-else-if="tab === 'etoiles'" class="pane">
      <p class="test-note"><Icon name="solar:danger-circle-bold-duotone" class="kick-ic" />Mode test (?achats=test) : aucun paiement réel.</p>
      <div class="rows">
        <div v-for="p in packs" :key="p.id" class="card row">
          <span class="prop-art gem"><Icon name="solar:star-bold-duotone" class="prop-ic" /></span>
          <span class="row-txt"><strong>{{ p.label }}</strong><span class="sub">+{{ p.gems }} Étoiles</span></span>
          <button class="buy small" @click="buyPack(p)">{{ p.priceLabel }}</button>
        </div>
      </div>
    </section>

    <!-- ============ FICHE D'UN VÊTEMENT ============ -->
    <Teleport to="body">
      <Transition name="pop">
        <div v-if="detail && !trying" class="modal" @click.self="closeDetail">
          <div class="sheet-card" role="dialog" aria-modal="true" :aria-label="detailItem.label">
            <button class="x" aria-label="Fermer" @click="closeDetail"><Icon name="solar:close-circle-bold" class="x-ic" /></button>

            <div class="hero" :class="{ party: celebrate }" :style="{ '--ink': inkFor(detail.color) }">
              <span class="hero-glow" />
              <Icon :name="itemIcon(detailItem.id)" class="hero-ic" />
              <template v-if="celebrate">
                <span v-for="k in CONFETTI" :key="k.i" class="confetti" :style="{ '--x': k.x + 'px', '--y': k.y + 'px', '--c': k.c, '--rot': k.r + 'deg', '--d': k.d + 's' }" />
              </template>
            </div>

            <h3 class="d-title">{{ detailItem.label }} <span class="d-color">{{ colorLabel(detail.color) }}</span></h3>
            <p class="d-sub">
              <span class="rar" :style="{ '--r': RARITIES[detailItem.rarity].color }">{{ RARITIES[detailItem.rarity].label }}</span>
              <span>{{ SLOT_LABELS[detailItem.slot] }}</span>
              <span v-if="detailSet">· Collection {{ detailSet.label }}</span>
            </p>

            <!-- pastilles de couleur -->
            <div class="swatches" role="radiogroup" aria-label="Couleur">
              <button
                v-for="k in detailColors"
                :key="k"
                class="sw"
                :class="{ on: detail.color === k, have: inv.ownsColor(detailItem.id, k), prem: COLORS[k].premium, off: COLORS[k].premium && !starsOpen }"
                role="radio"
                :aria-checked="detail.color === k"
                :aria-label="colorLabel(k) + (inv.ownsColor(detailItem.id, k) ? ' (possédée)' : '')"
                :style="{ background: swatchBg(k) }"
                @click="pickColor(k)"
              >
                <Icon v-if="inv.ownsColor(detailItem.id, k)" name="solar:check-circle-bold" class="sw-have" />
                <Icon v-else-if="COLORS[k].premium" name="solar:star-bold-duotone" class="sw-star" />
                <Icon v-if="tasteMark(k)" :name="tasteMark(k)" class="sw-taste" />
              </button>
            </div>
            <p class="d-count">{{ ownedColorCount }} / {{ detailColors.length }} couleurs dans ton Sac</p>

            <p v-if="tasteHint" class="taste-hint" :class="tasteHint.kind">
              <Icon :name="tasteHint.icon" class="kick-ic" />{{ tasteHint.text }}
            </p>
            <p v-if="reactionLine" class="bubble">« {{ reactionLine }} »</p>
            <p v-if="buyError" class="err" :class="{ shake: shakeKey }">{{ buyError }}</p>

            <div class="actions">
              <button v-if="canTry" class="ghost" @click="startTry"><Icon name="solar:eye-bold-duotone" class="btn-ic" />Essayer</button>
              <template v-if="inv.ownsColor(detailItem.id, detail.color)">
                <button v-if="isWorn" class="buy wide done" disabled><Icon name="solar:check-circle-bold" class="btn-ic" />Elle le porte</button>
                <button v-else class="buy wide" @click="wear"><Icon name="solar:hanger-bold-duotone" class="btn-ic" />Lui mettre</button>
              </template>
              <button v-else-if="detailLock" class="buy wide done" disabled><Icon name="solar:lock-keyhole-bold" class="btn-ic" />{{ detailLock }}</button>
              <button v-else class="buy wide" :class="{ poor: !inv.canAfford(detailPrice) }" @click="buy">
                <span>Acheter</span>
                <s v-if="detailDiscount" class="was">{{ detailBase.amount }}</s>
                <Icon :name="curIcon(detailPrice.currency)" class="mini-cur" :class="detailPrice.currency" />{{ detailPrice.amount }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- barre d'essayage : la fiche s'efface pour la voir en 3D -->
      <Transition name="slide">
        <div v-if="trying && detail" class="try-bar" role="dialog" aria-label="Essayage">
          <div class="try-head">
            <Icon name="solar:eye-bold-duotone" class="kick-ic" />
            <strong>Essayage · {{ detailItem.label }} {{ colorLabel(detail.color) }}</strong>
          </div>
          <div class="swatches tight">
            <button
              v-for="k in detailColors"
              :key="k"
              class="sw"
              :class="{ on: detail.color === k, have: inv.ownsColor(detailItem.id, k), off: COLORS[k].premium && !starsOpen }"
              :aria-label="colorLabel(k)"
              :style="{ background: swatchBg(k) }"
              @click="pickColor(k)"
            >
              <Icon v-if="inv.ownsColor(detailItem.id, k)" name="solar:check-circle-bold" class="sw-have" />
            </button>
          </div>
          <div class="actions">
            <button class="ghost" @click="stopTry()">Retirer</button>
            <button v-if="inv.ownsColor(detailItem.id, detail.color)" class="buy wide" @click="stopTry(true); wear()">Lui mettre</button>
            <button v-else-if="!detailLock" class="buy wide" :class="{ poor: !inv.canAfford(detailPrice) }" @click="stopTry(); buy()">
              Acheter <Icon :name="curIcon(detailPrice.currency)" class="mini-cur" :class="detailPrice.currency" />{{ detailPrice.amount }}
            </button>
            <button v-else class="buy wide done" disabled>{{ detailLock }}</button>
          </div>
        </div>
      </Transition>

      <!-- coffre du jour -->
      <Transition name="pop">
        <div v-if="chest.phase !== 'idle'" class="modal center" @click.self="chest.phase === 'open' && closeChest()">
          <div class="chest-card" role="dialog" aria-modal="true" aria-label="Coffre du jour">
            <div class="chest-stage" :class="chest.phase">
              <span class="rays" />
              <Icon name="solar:gift-bold-duotone" class="big-gift" />
              <template v-if="chest.phase === 'open'">
                <span v-for="k in CONFETTI" :key="k.i" class="confetti" :style="{ '--x': k.x * 1.3 + 'px', '--y': k.y * 1.3 + 'px', '--c': k.c, '--rot': k.r + 'deg', '--d': k.d + 's' }" />
              </template>
            </div>
            <template v-if="chest.phase === 'open' && chest.result">
              <p class="chest-kicker">Dans le coffre…</p>
              <div class="loot">
                <template v-if="chest.result.kind === 'item'">
                  <span class="loot-art" :style="{ '--ink': inkFor(chest.result.item.color) }"><Icon :name="itemIcon(chest.result.item.id)" class="loot-ic" /></span>
                  <strong>{{ chest.result.label }}</strong>
                </template>
                <template v-else-if="chest.result.kind === 'ingredients'">
                  <span class="loot-foods">
                    <span v-for="(q, id) in chest.result.ingredients" :key="id" class="loot-food">{{ ingredientById(id)?.emoji }}<small>×{{ q }}</small></span>
                  </span>
                  <strong>{{ chest.result.label }}</strong>
                </template>
                <template v-else>
                  <span class="loot-art coin"><Icon :name="curIcon('coins')" class="loot-ic" /></span>
                  <strong>+{{ chest.result.coins }} pièces</strong>
                </template>
              </div>
              <button class="buy wide" @click="closeChest">Super !</button>
              <p class="chest-foot">Un nouveau coffre gratuit t'attend demain.</p>
            </template>
            <template v-else-if="chest.phase === 'shake'">
              <p class="chest-kicker">Qu'y a-t-il dedans ?</p>
            </template>
            <template v-else-if="chest.phase === 'later'">
              <p class="chest-kicker">Tu as déjà ouvert le coffre aujourd'hui.</p>
              <p class="chest-foot">Reviens demain : il sera de nouveau plein !</p>
              <button class="buy wide" @click="closeChest">D'accord</button>
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
});
// navigate : { to: "cuisine" | "sac", tab? } ; tryon : true pendant l'essayage (la fiche est masquée)
const emit = defineEmits(["navigate", "tryon"]);

const inv = useInventoryStore();
const store = useTamagotchiStore();
const root = ref(null);

inv.ensureShop();

const has = (k) => !!store.hasFeature?.(k);
const starsOpen = computed(() => has("etoiles") || inv.gems > 0);
const curIcon = (cur) => (cur === "gems" ? "solar:star-bold-duotone" : "solar:dollar-minimalistic-bold-duotone");
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
const slotFilter = ref("all");
const slotChips = [{ key: "all", label: "Tout" }, ...SLOTS.map((s) => ({ key: s, label: SLOT_LABELS[s], icon: SLOT_ICONS[s] }))];
const daily = computed(() => inv.dailyColor);
const dailyItem = computed(() => (daily.value ? itemById(daily.value.itemId) : null));

function shortLock(item, lock) {
  if (!lock) return "";
  if (store.level < item.minLevel) return `Niveau ${item.minLevel}`;
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
  if (trying.value) preview();
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
  if (!detail.value) return;
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
}
function wear() {
  if (!detail.value) return;
  const item = itemById(detail.value.id);
  const r = inv.equip(item.slot, item.id, detail.value.color);
  if (!r) return fail("Impossible de lui mettre pour le moment.");
  reactionLine.value = r.reaction?.line || "";
  buzz(15);
}

// ---------- essayage gratuit (aperçu 3D, sans acheter) ----------
// useOutfitPreview agit sur la créature habillée par bindOutfit (Tamagotchi.vue)
const outfitPreview = useOutfitPreview();
const canTry = computed(() => !!detail.value && !!outfitPreview.creature.value);
const trying = ref(false);
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
  emit("tryon", true);
  // on efface la fenêtre de la boutique pour la voir en 3D
  hiddenOverlay = root.value?.closest(".overlay") || null;
  if (hiddenOverlay) hiddenOverlay.classList.add("shop-trying");
}
function stopTry() {
  if (!trying.value) return;
  trying.value = false;
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
.shop { display: grid; gap: 12px; padding-bottom: 8px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }

/* coffre */
.chest-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 4px 14px 4px 8px;
  border: 0;
  border-radius: 999px;
  background: #f1f3f6;
  color: #7a8494;
  font: 800 14px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.chest-btn.ready {
  background: linear-gradient(180deg, #fff3d6, #ffe2a3);
  color: #8a5a00;
  box-shadow: 0 4px 0 #f0c25e, 0 6px 14px rgba(240, 170, 40, 0.3);
}
.chest-ic { width: 30px; height: 30px; color: #c9a14a; }
.ready .chest-ic { color: #e8781c; animation: wobble 1.8s ease-in-out infinite; }
.chest-dot { position: absolute; top: 2px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: #ff4f86; box-shadow: 0 0 0 2px #fff; }
@keyframes wobble {
  0%, 70%, 100% { transform: rotate(0); }
  76% { transform: rotate(-14deg) scale(1.08); }
  82% { transform: rotate(12deg) scale(1.08); }
  88% { transform: rotate(-8deg); }
  94% { transform: rotate(5deg); }
}

/* onglets */
.tabs { display: flex; gap: 4px; padding: 4px; border-radius: 18px; background: #eef1f5; }
.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #6b7686;
  font: 800 14px "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.tab.on { background: #fff; color: var(--ink, #2f3a4a); box-shadow: 0 2px 8px rgba(40, 55, 80, 0.12); }
.tab-ic { width: 20px; height: 20px; }
.tab.on .tab-ic { color: var(--accent, #4fbf34); }
.pane { display: grid; gap: 12px; }

/* coloris du jour */
.daily {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid #ffd27a;
  border-radius: 22px;
  background: linear-gradient(135deg, #fffaf0, #fff0d1);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(240, 170, 40, 0.18);
}
.daily-art { flex: none; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 18px; background: #fff; box-shadow: inset 0 -3px 0 rgba(40, 55, 80, 0.06); }
.daily-ic { width: 44px; height: 44px; color: var(--ink); filter: drop-shadow(0 2px 2px rgba(40, 55, 80, 0.2)); }
.daily-txt { display: grid; gap: 2px; min-width: 0; color: var(--ink, #2f3a4a); }
.daily-txt strong { font: 700 17px "Fredoka", "Nunito", system-ui, sans-serif; }
.daily-kicker { display: inline-flex; align-items: center; gap: 4px; font: 800 12px "Nunito", system-ui, sans-serif; color: #c46a00; text-transform: uppercase; letter-spacing: 0.03em; }
.kick-ic { width: 18px; height: 18px; flex: none; }
.daily-price { display: inline-flex; align-items: center; gap: 3px; font-weight: 800; color: #5b6676; }
.daily-price s { color: #a3abb7; margin-right: 4px; }
.daily-badge { margin-left: auto; flex: none; padding: 6px 10px; border-radius: 999px; background: #ff6b3d; color: #fff; font: 800 15px "Fredoka", "Nunito", system-ui, sans-serif; transform: rotate(6deg); box-shadow: 0 3px 0 #d94e22; }

/* filtres */
.chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 38px;
  padding: 0 12px;
  border: 2px solid transparent;
  border-radius: 999px;
  background: #fff;
  color: #5b6676;
  font: 800 13px "Nunito", system-ui, sans-serif;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(40, 55, 80, 0.08);
}
.chip.on { border-color: #8fdc6a; background: #f3fdec; color: #2a7a1a; }
.chip-ic { width: 18px; height: 18px; }

/* cartes */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.card { background: #fff; border-radius: 20px; box-shadow: 0 4px 14px rgba(40, 55, 80, 0.1); }
.item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.08s;
}
.item:active { transform: scale(0.96); }
.item.owned { border-color: #d7f2c9; }
.item.complete { background: linear-gradient(180deg, #fff, #f3fdec); }
.item.locked .art-ic { opacity: 0.35; filter: grayscale(0.7); }
.art { position: relative; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff, #f1f4f8); }
.art-ic { width: 44px; height: 44px; color: var(--ink); filter: drop-shadow(0 2px 2px rgba(40, 55, 80, 0.22)); }
.art-lock { position: absolute; right: 0; bottom: 0; width: 20px; height: 20px; padding: 3px; border-radius: 50%; background: #fff; color: #8a94a3; box-shadow: 0 1px 4px rgba(40, 55, 80, 0.2); }
.name { font: 700 13px/1.15 "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); text-align: center; min-height: 2.3em; display: grid; place-items: center; }
.dots { display: flex; gap: 3px; }
.dot { width: 9px; height: 9px; border-radius: 50%; opacity: 0.35; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1); }
.dot.have { opacity: 1; box-shadow: 0 0 0 1.5px #fff, 0 0 0 3px #8fdc6a; }
.meta { display: inline-flex; align-items: center; gap: 2px; min-height: 20px; font: 800 13px "Nunito", system-ui, sans-serif; color: #5b6676; }
.have { color: #3c9a22; margin-right: 2px; }
.mini-cur { width: 17px; height: 17px; color: #f2b01e; }
.mini-cur.gems { color: #a77bff; }
.ok-ic { width: 16px; height: 16px; color: #3c9a22; margin-right: 2px; }
.tag { position: absolute; top: 6px; left: 6px; padding: 2px 7px; border-radius: 999px; font: 800 10px "Nunito", system-ui, sans-serif; background: color-mix(in srgb, var(--r) 16%, #fff); color: color-mix(in srgb, var(--r) 80%, #000); }
.tag.sale { background: #ff6b3d; color: #fff; }
.new { position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; border-radius: 50%; background: #ff4f86; box-shadow: 0 0 0 2px #fff; }
.foot-note { margin: 0; text-align: center; font-size: 12px; font-weight: 700; color: #8a94a3; }

/* lignes (épicerie, objets) */
.rows { display: grid; gap: 8px; }
.row { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px; transition: box-shadow 0.3s; }
.row.focus { box-shadow: 0 0 0 3px #ffc21a, 0 4px 14px rgba(40, 55, 80, 0.1); }
.row.soon { opacity: 0.55; }
.food { flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: #f6f8fb; font-size: 28px; }
.row-txt { flex: 1; display: grid; min-width: 0; }
.row-txt strong { font: 700 16px "Fredoka", "Nunito", system-ui, sans-serif; color: var(--ink, #2f3a4a); }
.sub { font-size: 12px; font-weight: 700; color: #8a94a3; }
.stepper { display: inline-flex; align-items: center; }
.step { display: grid; place-items: center; width: 34px; height: 44px; border: 0; background: none; color: var(--accent, #4fbf34); cursor: pointer; }
.step:disabled { color: #ccd2da; cursor: default; }
.step-ic { width: 26px; height: 26px; }
.qty { min-width: 18px; text-align: center; font: 700 17px "Fredoka", "Nunito", system-ui, sans-serif; }
.row-lock { width: 22px; height: 22px; color: #9aa4b2; }
.prop-art { flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: #eefae6; }
.prop-art.gem { background: #f2ebff; }
.prop-ic { width: 28px; height: 28px; color: #3c9a22; }
.gem .prop-ic { color: #a77bff; }
.owned-pill { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; background: #eefae6; color: #2a7a1a; font: 800 12px "Nunito", system-ui, sans-serif; }
.float { position: absolute; right: 26px; top: 0; padding: 2px 8px; border-radius: 999px; background: #fff; color: #2a9a3a; font: 800 14px "Fredoka", "Nunito", system-ui, sans-serif; box-shadow: 0 2px 6px rgba(40, 55, 80, 0.2); pointer-events: none; animation: up 0.9s ease-out forwards; }
@keyframes up { 0% { transform: translateY(6px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(-30px); opacity: 0; } }
.link { justify-self: center; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 999px; background: #eefae6; color: #2a7a1a; font: 800 14px "Nunito", system-ui, sans-serif; cursor: pointer; }
.link-ic { width: 22px; height: 22px; }
.test-note { margin: 0; display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 14px; background: #fff4e0; color: #8a5a00; font-weight: 800; font-size: 13px; }

/* boutons */
.buy {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(180deg, var(--accent-hi, #7ad85a), var(--accent, #4fbf34));
  color: #fff;
  font: 700 17px "Fredoka", "Nunito", system-ui, sans-serif;
  box-shadow: 0 4px 0 var(--accent-lo, #36912a);
  cursor: pointer;
}
.buy:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--accent-lo, #36912a); }
.buy .mini-cur { color: #fff6c9; }
.buy .mini-cur.gems { color: #f1e6ff; }
.buy.small { min-height: 44px; padding: 0 12px; font-size: 15px; border-radius: 14px; }
.buy.wide { flex: 1; }
.buy.poor { background: linear-gradient(180deg, #c9d0d9, #aeb7c3); box-shadow: 0 4px 0 #8f99a6; }
.buy.done, .buy:disabled { background: #eef1f5; color: #6b7686; box-shadow: none; cursor: default; transform: none; }
.buy .was { opacity: 0.7; font-size: 14px; margin: 0 2px 0 6px; }
.ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 16px;
  border: 2px solid #d7dde5;
  border-radius: 16px;
  background: #fff;
  color: var(--ink, #2f3a4a);
  font: 700 16px "Fredoka", "Nunito", system-ui, sans-serif;
  cursor: pointer;
}
.btn-ic { width: 22px; height: 22px; }

/* fiche (téléportée) */
.modal { position: fixed; inset: 0; z-index: 40; display: flex; align-items: flex-end; justify-content: center; background: rgba(40, 20, 60, 0.35); }
.modal.center { align-items: center; padding: 16px; }
.sheet-card {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 92%;
  overflow-y: auto;
  padding: 16px 20px calc(env(safe-area-inset-bottom, 0px) + 20px);
  border-radius: 30px 30px 0 0;
  background: #fff;
  color: var(--ink, #2f3a4a);
  box-shadow: 0 -10px 40px rgba(30, 15, 50, 0.3);
  display: grid;
  gap: 10px;
}
.x { position: absolute; top: 12px; right: 12px; z-index: 2; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: #f4f6f9; color: var(--ink, #2f3a4a); cursor: pointer; }
.x-ic { width: 24px; height: 24px; }
.hero { position: relative; display: grid; place-items: center; height: 150px; }
.hero-glow { position: absolute; width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--ink) 22%, #fff) 0%, #fff 70%); }
.hero-ic { position: relative; width: 104px; height: 104px; color: var(--ink); filter: drop-shadow(0 6px 6px rgba(40, 55, 80, 0.22)); transition: color 0.25s; }
.hero.party .hero-ic { animation: boing 0.7s cubic-bezier(0.3, 1.6, 0.5, 1); }
@keyframes boing { 0% { transform: scale(0.6) rotate(-10deg); } 60% { transform: scale(1.18) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }
.confetti { position: absolute; left: 50%; top: 55%; width: 10px; height: 14px; border-radius: 3px; background: var(--c); opacity: 0; animation: confetti 1.1s ease-out var(--d) forwards; }
@keyframes confetti {
  0% { transform: translate(-50%, 0) rotate(0) scale(0.5); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--x)), calc(var(--y) + 60px)) rotate(var(--rot)) scale(1); opacity: 0; }
}
.d-title { margin: 0; text-align: center; font: 700 24px "Fredoka", "Nunito", system-ui, sans-serif; }
.d-color { color: #8a94a3; font-weight: 600; }
.d-sub { margin: 0; display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; font-weight: 700; font-size: 13px; color: #6b7686; }
.rar { padding: 1px 8px; border-radius: 999px; background: color-mix(in srgb, var(--r) 16%, #fff); color: color-mix(in srgb, var(--r) 80%, #000); }
.swatches { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; padding: 4px 0; }
.swatches.tight { gap: 8px; }
.sw { position: relative; width: 44px; height: 44px; border: 3px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 0 0 1px rgba(40, 55, 80, 0.15), 0 3px 6px rgba(40, 55, 80, 0.15); transition: transform 0.1s; }
.tight .sw { width: 38px; height: 38px; }
.sw.on { transform: scale(1.12); box-shadow: 0 0 0 3px var(--accent, #4fbf34), 0 4px 10px rgba(40, 55, 80, 0.2); }
.sw.off { opacity: 0.4; }
.sw-have { position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; border-radius: 50%; background: #fff; color: #3c9a22; }
.sw-star { position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; border-radius: 50%; background: #fff; color: #a77bff; }
.sw-taste { position: absolute; left: -6px; top: -6px; width: 20px; height: 20px; border-radius: 50%; background: #fff; color: #ff4f86; }
.d-count { margin: 0; text-align: center; font-size: 13px; font-weight: 800; color: #8a94a3; }
.taste-hint { margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border-radius: 14px; font-weight: 800; font-size: 14px; }
.taste-hint.love { background: #ffeef4; color: #c22d63; }
.taste-hint.dislike { background: #efe6ff; color: #5b3aa8; }
.bubble { margin: 0; padding: 10px 14px; border-radius: 18px 18px 18px 6px; background: #f3fdec; color: #2a7a1a; font-weight: 800; text-align: center; }
.err { margin: 0; text-align: center; font-weight: 800; font-size: 14px; color: #c42a24; }
.shake { animation: shake 0.35s; }
@keyframes shake { 25% { transform: translateX(-6px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-3px); } }
.actions { display: flex; gap: 8px; }

/* barre d'essayage */
.try-bar {
  position: fixed;
  left: 50%;
  bottom: calc(var(--nav-h, 78px) + env(safe-area-inset-bottom, 0px) + 10px);
  z-index: 40;
  width: min(460px, calc(100% - 24px));
  transform: translateX(-50%);
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.97);
  color: var(--ink, #2f3a4a);
  box-shadow: 0 10px 30px rgba(30, 15, 50, 0.25);
}
.try-head { display: flex; align-items: center; gap: 6px; font: 600 15px "Fredoka", "Nunito", system-ui, sans-serif; color: #2a7a1a; }

/* coffre (modale) */
.chest-card { width: min(360px, 100%); display: grid; gap: 10px; justify-items: center; padding: 22px 20px 18px; border-radius: 30px; background: #fff; color: var(--ink, #2f3a4a); box-shadow: 0 16px 50px rgba(30, 15, 50, 0.35); text-align: center; }
.chest-stage { position: relative; display: grid; place-items: center; width: 180px; height: 160px; }
.big-gift { position: relative; width: 120px; height: 120px; color: #e8781c; filter: drop-shadow(0 8px 8px rgba(160, 80, 0, 0.25)); }
.shake .big-gift { animation: chestShake 0.5s ease-in-out infinite; }
.open .big-gift { animation: chestPop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) forwards; }
.rays { position: absolute; inset: -20px; border-radius: 50%; opacity: 0; background: repeating-conic-gradient(from 0deg, rgba(255, 200, 60, 0.35) 0 12deg, transparent 12deg 30deg); }
.open .rays { opacity: 1; animation: spin 6s linear infinite; -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); }
@keyframes chestShake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-10deg) translateY(-3px); } 75% { transform: rotate(10deg) translateY(-3px); } }
@keyframes chestPop { 0% { transform: scale(1); } 40% { transform: scale(1.3) translateY(-10px); } 100% { transform: scale(0.8) translateY(18px); opacity: 0.5; } }
@keyframes spin { to { transform: rotate(360deg); } }
.chest-kicker { margin: 0; font: 600 18px "Fredoka", "Nunito", system-ui, sans-serif; }
.loot { display: grid; gap: 8px; justify-items: center; animation: boing 0.6s cubic-bezier(0.3, 1.6, 0.5, 1); }
.loot strong { font: 700 20px "Fredoka", "Nunito", system-ui, sans-serif; }
.loot-art { display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff, #f1f4f8); box-shadow: 0 4px 14px rgba(40, 55, 80, 0.15); }
.loot-art.coin .loot-ic { color: #f2b01e; }
.loot-ic { width: 56px; height: 56px; color: var(--ink); }
.loot-foods { display: flex; gap: 8px; font-size: 40px; }
.loot-food small { font: 800 14px "Nunito", system-ui, sans-serif; color: #5b6676; }
.chest-foot { margin: 0; font-size: 13px; font-weight: 700; color: #8a94a3; }
.chest-card .buy { width: 100%; }

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
  .ready .chest-ic, .shake .big-gift, .open .rays, .hero.party .hero-ic, .loot { animation: none; }
  .confetti { display: none; }
}
</style>

<style>
/* essayage : la fenêtre de la boutique s'efface pour laisser voir la créature en 3D */
.overlay.shop-trying { background: transparent !important; pointer-events: none; }
.overlay.shop-trying > .sheet { transform: translateY(110%); transition: transform 0.3s ease; }
</style>
