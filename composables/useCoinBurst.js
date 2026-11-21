// composables/useCoinBurst.js : petit bus des « +N » volants de l'écran principal.
// burst(n, x?, y?, { currency }) ajoute une gerbe de pièces (ou d'Étoiles) à l'écran ;
// x, y en pixels (coordonnées de la fenêtre), sinon au-dessus de la créature.
// <CoinBurst /> (monté une fois sur l'écran principal) affiche les gerbes et branche aussi
// automatiquement les gains du Sac (gameBus.coinFx, posé par inventory.earn / earnGems).
import { reactive } from "vue";

export const coinBursts = reactive([]);
let nextId = 0;

export function burst(n, x, y, { currency = "coins" } = {}) {
  n = Math.round(Number(n) || 0);
  if (n <= 0) return null;
  const id = ++nextId;
  // les gains rapprochés s'empilent un peu en hauteur au lieu de se superposer
  const stack = coinBursts.length % 3;
  coinBursts.push({ id, n, currency, x: Number.isFinite(x) ? x : null, y: Number.isFinite(y) ? y : null, stack });
  if (coinBursts.length > 6) coinBursts.splice(0, coinBursts.length - 6);
  setTimeout(() => {
    const i = coinBursts.findIndex((b) => b.id === id);
    if (i >= 0) coinBursts.splice(i, 1);
  }, 1500);
  return id;
}

export function useCoinBurst() {
  return { bursts: coinBursts, burst };
}
