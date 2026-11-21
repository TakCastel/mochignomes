// Récupère une ancienne sauvegarde stockée en cookie et la déplace dans localStorage.
// Doit passer avant la première lecture des stores (les plugins s'exécutent avant les composants).
const KEYS = ["tamagotchi", "inventory"];

// Réglages de l'appareil gardés lors d'une remise à zéro complète
const KEEP = ["tamagotchi-haptics", "tamagotchi-sound"];

export default defineNuxtPlugin(() => {
  // Nouvelle partie demandée : tout effacer AVANT que les stores ne relisent la sauvegarde
  try {
    if (localStorage.getItem("tamagotchi-wipe") === "1") {
      for (const k of Object.keys(localStorage)) {
        if ((k === "inventory" || k.startsWith("tamagotchi")) && !KEEP.includes(k)) localStorage.removeItem(k);
      }
      for (const key of KEYS) document.cookie = `${key}=; Max-Age=0; path=/`;
      return;
    }
  } catch { /* stockage indisponible */ }
  try {
    const jar = Object.fromEntries(
      document.cookie.split(/;\s*/).filter(Boolean).map((c) => {
        const i = c.indexOf("=");
        return [c.slice(0, i), c.slice(i + 1)];
      }),
    );
    for (const key of KEYS) {
      const raw = jar[key];
      if (!raw) continue;
      if (!localStorage.getItem(key)) {
        const value = decodeURIComponent(raw);
        JSON.parse(value); // ne recopie qu'une sauvegarde lisible
        localStorage.setItem(key, value);
      }
      document.cookie = `${key}=; Max-Age=0; path=/`;
    }
  } catch { /* stockage indisponible ou cookie illisible : on garde l'état par défaut */ }
});
