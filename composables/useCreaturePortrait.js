// composables/useCreaturePortrait.js
// Avatar généré à partir de la créature vivante (liveCreature.portrait) : sa couleur, sa forme,
// sa tenue. Mis en cache dans localStorage (une image par créature de la maison : clé
// « tamagotchi-portrait:<id> »), refait quand son apparence, sa tenue ou son stade changent.
// Le dernier portrait est aussi rangé dans son nid (store.roster[].portrait) pour les cartes
// de la maison. Secours : l'image fixe /images/avatar.webp.
//
//   const { src, live } = useCreaturePortrait()   // src : URL de l'image, live : portrait généré ?
import { computed, effectScope, ref, watch } from "vue";
import { liveCreature, activeActivity } from "~/composables/useLiveCreature";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { useInventoryStore } from "~/stores/useInventoryStore";

const FALLBACK = "/images/avatar.webp";
const KEY = "tamagotchi-portrait";
const url = ref("");
let started = false;

const keyOf = (id) => `${KEY}:${id || "?"}`;
function readCache(id) {
  try { return JSON.parse(localStorage.getItem(keyOf(id)) || "null"); } catch { return null; }
}
function writeCache(id, v) {
  try { localStorage.setItem(keyOf(id), JSON.stringify(v)); } catch { /* stockage plein ou bloqué */ }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try { localStorage.removeItem(KEY); } catch { /* ancienne clé unique, d'avant la maison */ }
  const store = useTamagotchiStore();
  const inv = useInventoryStore();
  const sig = () => (store.hatched && store.appearance
    ? JSON.stringify([store.activeId, store.hatchedAt, store.appearance, store.stage, inv.outfit])
    : "");
  let timer = null, tries = 0;

  async function capture() {
    timer = null;
    const s = sig();
    if (!s) return;
    const c = liveCreature.value;
    let busy = !c?.portrait || !!activeActivity.value || document.visibilityState !== "visible";
    if (!busy) {
      try { busy = (await import("~/lib/cosmetics3d.js")).isPreviewing(c); } catch { /* pas de tenue */ }
    }
    if (busy) {
      if (++tries < 40) timer = setTimeout(capture, 3000);
      return;
    }
    tries = 0;
    let data = null;
    try { data = c.portrait({ size: 160 }); } catch (err) { console.warn("[portrait]", err); }
    if (!data || s !== sig()) return;
    url.value = data;
    writeCache(store.activeId, { sig: s, id: store.hatchedAt, url: data });
    store.setPortrait?.(store.activeId, data);
  }
  function refresh() {
    const s = sig();
    clearTimeout(timer); timer = null;
    if (!s) { url.value = ""; return; }
    const cached = readCache(store.activeId);
    if (cached?.sig === s) { url.value = cached.url; store.setPortrait?.(store.activeId, cached.url); return; }
    // même créature, autre tenue : l'ancienne image en attendant la nouvelle
    url.value = cached?.id === store.hatchedAt ? cached.url : "";
    tries = 0;
    timer = setTimeout(capture, 1500);
  }

  effectScope(true).run(() => {
    watch(sig, refresh, { immediate: true });
    watch(liveCreature, (c) => { if (c && sig() && readCache(store.activeId)?.sig !== sig()) refresh(); });
  });
}

export function useCreaturePortrait() {
  start();
  return {
    src: computed(() => url.value || FALLBACK),
    live: computed(() => !!url.value),
  };
}
