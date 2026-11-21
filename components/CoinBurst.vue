<template>
  <!-- « +N » volants de l'écran principal (aucun montant total ici : il reste dans Sac/Boutique) -->
  <div class="coin-burst" aria-hidden="true">
    <div
      v-for="b in bursts"
      :key="b.id"
      class="burst"
      :class="b.currency"
      :style="posOf(b)"
    >
      <span v-for="k in COINS" :key="k.i" class="coin" :style="{ '--dx': k.dx + 'px', '--dy': k.dy + 'px', '--d': k.d + 's', '--r': k.r + 'deg' }">
        <Icon :name="iconOf(b)" class="coin-ic" />
      </span>
      <span class="pill">
        <Icon :name="iconOf(b)" class="pill-ic" />+{{ b.n }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { watch } from "vue";
import { gameBus } from "~/composables/useCreatureMood";
import { useCoinBurst } from "~/composables/useCoinBurst";

const props = defineProps({
  // brancher automatiquement les gains du Sac (inventory.earn / earnGems → gameBus.coinFx)
  auto: { type: Boolean, default: true },
});

const { bursts, burst } = useCoinBurst();

// trajectoires fixes des petites pièces (aucun calcul par image)
const COINS = [
  { i: 0, dx: -46, dy: -20, d: 0, r: -40 },
  { i: 1, dx: 40, dy: -34, d: 0.04, r: 30 },
  { i: 2, dx: -22, dy: -58, d: 0.08, r: -15 },
  { i: 3, dx: 28, dy: -66, d: 0.1, r: 50 },
  { i: 4, dx: 56, dy: -8, d: 0.06, r: 80 },
  { i: 5, dx: -60, dy: -44, d: 0.12, r: -70 },
];

const iconOf = (b) => (b.currency === "gems" ? "solar:star-bold-duotone" : "solar:dollar-minimalistic-bold-duotone");
function posOf(b) {
  const lift = b.stack * 34;
  if (b.x != null && b.y != null) return { left: b.x + "px", top: b.y - lift + "px" };
  return { left: "50%", top: `calc(40% - ${lift}px)` };
}

if (props.auto) {
  watch(() => gameBus.coinFx?.id, () => {
    const fx = gameBus.coinFx;
    if (!fx) return;
    if (fx.coins > 0) burst(fx.coins, fx.x, fx.y);
    if (fx.gems > 0) burst(fx.gems, fx.x, fx.y, { currency: "gems" });
  });
}
</script>

<style scoped>
.coin-burst { position: fixed; inset: 0; z-index: 15; pointer-events: none; overflow: hidden; }
.burst { position: absolute; width: 0; height: 0; }
.pill {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 14px 0 8px;
  border-radius: var(--r-pill);
  background: #fff;
  color: var(--coin-ink);
  font: 700 var(--t-xl)/1 var(--font-title);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  box-shadow: var(--sh-3), var(--hl);
  animation: rise 1.4s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}
.gems .pill { color: var(--gem-ink); }
.pill-ic { width: 22px; height: 22px; color: var(--coin); }
.gems .pill-ic { color: var(--gem); }
.coin {
  position: absolute;
  left: -9px;
  top: -9px;
  opacity: 0;
  animation: pop 0.9s ease-out var(--d) forwards;
}
.coin-ic { width: 18px; height: 18px; color: var(--coin); filter: drop-shadow(0 2px 2px rgba(120, 80, 0, 0.25)); }
.gems .coin-ic { color: var(--gem); }
@keyframes rise {
  0% { transform: translate(-50%, 10px) scale(0.5); opacity: 0; }
  15% { transform: translate(-50%, -6px) scale(1.12); opacity: 1; }
  30% { transform: translate(-50%, -12px) scale(1); }
  75% { opacity: 1; }
  100% { transform: translate(-50%, -64px) scale(0.95); opacity: 0; }
}
@keyframes pop {
  0% { transform: translate(0, 0) scale(0.4) rotate(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1) rotate(var(--r)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .coin { display: none; }
  .pill { animation: fade 1.4s forwards; transform: translate(-50%, -20px); }
  @keyframes fade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
}
</style>
