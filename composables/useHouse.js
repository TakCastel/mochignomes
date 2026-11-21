// composables/useHouse.js : la maison des mochignomes (plusieurs créatures, une seule dans le pré).
// Orchestration côté écran : petite transition (elle rapetisse et s'en va, l'autre arrive en
// grandissant, voir Tamagotchi.vue houseFx), puis la nouvelle venue dit bonjour.
// Les règles (places, repos au ralenti, échange des données) vivent dans le store principal.
import { reactive } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { activeActivity } from "~/composables/useLiveCreature";
import { gameBus, gameToast, gameSay, gameCommand, closePage, closeSheet } from "~/composables/useCreatureMood";

// swapping : la créature du pré s'efface (Tamagotchi.vue la fait rapetisser)
export const houseFx = reactive({ swapping: false });

const OUT_MS = 520; // le temps qu'elle disparaisse
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const busy = () => !!gameBus.activity || !!activeActivity.value;

async function swap(run) {
  if (houseFx.swapping) return null;
  if (busy()) { gameToast("Pas pendant une activité !", "solar:home-smile-bold-duotone"); return null; }
  closePage();
  closeSheet();
  houseFx.swapping = true;
  await wait(OUT_MS);
  let res = null;
  try { res = run(); } finally {
    // laisse la scène prendre la nouvelle apparence avant de la faire grandir
    await wait(60);
    houseFx.swapping = false;
  }
  return res;
}

// Fait venir une créature qui se reposait
export async function bringCreature(id) {
  const store = useTamagotchiStore();
  const res = await swap(() => store.switchTo(id));
  if (!res) return false;
  if (!res.ok) { gameToast(res.reason, "solar:home-smile-bold-duotone"); return false; }
  if (store.hatched) {
    setTimeout(() => {
      gameCommand("react", "retrouvailles");
      if (res.line) setTimeout(() => gameSay(res.line), 120);
    }, 450);
  }
  return true;
}

// Adopte un œuf : il arrive dans le pré (l'écran d'éclosion prend le relais)
export async function adoptEgg() {
  const store = useTamagotchiStore();
  const res = await swap(() => store.adoptEgg());
  if (res && !res.ok) gameToast(res.reason, "solar:home-smile-bold-duotone");
  return !!res?.ok;
}

export function useHouse() {
  return { houseFx, bringCreature, adoptEgg };
}
