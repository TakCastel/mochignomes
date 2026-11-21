// Récupère une ancienne sauvegarde stockée en cookie et la déplace dans localStorage.
// Doit passer avant la première lecture des stores (les plugins s'exécutent avant les composants).
const KEYS = ["tamagotchi", "inventory"];

export default defineNuxtPlugin(() => {
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
