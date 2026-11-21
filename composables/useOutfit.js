// composables/useOutfit.js
// Relie la tenue du Sac (inventory.outfit) à la créature 3D, et offre l'essayage
// à n'importe quel écran (boutique, garde-robe) sans connaître la créature.
//
//   // dans Tamagotchi.vue (setup), creature = shallowRef(createCreature(...))
//   bindOutfit(creature)
//
//   // ailleurs (boutique) : essayer sans acheter
//   const { preview, endPreview } = useOutfitPreview()
//   preview({ tete: { id: "bonnet", color: "rouge" } })   ...   endPreview()
import { getCurrentScope, onScopeDispose, shallowRef, unref, watch } from "vue";
import { useInventoryStore } from "~/stores/useInventoryStore";

// créature actuellement habillée (une seule à l'écran)
const boundCreature = shallowRef(null);
// module 3D chargé à la demande (Three.js reste hors du bundle initial)
let mod = null;
const load = () => (mod ? Promise.resolve(mod) : import("~/lib/cosmetics3d.js").then((m) => (mod = m)));

export function bindOutfit(creatureRef) {
  const inv = useInventoryStore();
  let current = null;
  let alive = true;
  const stop = watch(
    [() => unref(creatureRef), () => inv.outfit],
    async ([creature, outfit]) => {
      const m = await load();
      if (!alive) return;
      if (current && current !== creature) {
        try { m.disposeOutfit(current); } catch { /* créature déjà détruite */ }
        if (boundCreature.value === current) boundCreature.value = null;
      }
      current = creature || null;
      if (!current) return;
      boundCreature.value = current;
      m.applyOutfit(current, outfit);
    },
    { immediate: true, deep: true },
  );
  const unbind = () => {
    alive = false;
    stop();
    if (current && mod) { try { mod.disposeOutfit(current); } catch { /* créature déjà détruite */ } }
    if (boundCreature.value === current) boundCreature.value = null;
    current = null;
  };
  if (getCurrentScope()) onScopeDispose(unbind);
  return { unbind };
}

// Essayage sur la créature affichée (sans effet sur la tenue enregistrée)
export function useOutfitPreview() {
  let restore = null;
  function preview(outfit) {
    const c = boundCreature.value;
    if (!c || !mod) return false;
    restore = mod.previewOutfit(c, outfit);
    return true;
  }
  function endPreview() {
    if (restore) { restore(); restore = null; }
  }
  if (getCurrentScope()) onScopeDispose(endPreview);
  return { preview, endPreview, creature: boundCreature };
}
