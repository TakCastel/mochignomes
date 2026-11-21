// Le badge « Powered by Netlify » est désactivé dans les réglages du site, mais l'hébergeur
// l'injecte quand même (dans un cadre isolé, par-dessus la barre de navigation).
// On ne garde dans <body> que ce qui appartient au jeu ; le reste est retiré.
export default defineNuxtPlugin(() => {
  const KEEP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "NOSCRIPT", "TEMPLATE"]);
  const ours = (el: Element) =>
    el.id === "__nuxt" ||
    el.id === "teleports" ||
    KEEP_TAGS.has(el.tagName) ||
    el.hasAttribute("download") || // lien temporaire de téléchargement (rappel d'agenda)
    Array.from(el.attributes).some((a) => a.name.startsWith("data-v-")); // fenêtres du jeu (Teleport)
  const sweep = () => {
    for (const el of Array.from(document.body.children)) if (!ours(el)) el.remove();
    for (const el of Array.from(document.documentElement.children)) {
      if (el !== document.head && el !== document.body) el.remove();
    }
  };
  sweep();
  new MutationObserver(sweep).observe(document.body, { childList: true });
  new MutationObserver(sweep).observe(document.documentElement, { childList: true });
});
