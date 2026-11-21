// Le badge « Powered by Netlify » est désactivé dans les réglages du site, mais l'hébergeur
// peut encore l'injecter dans la page : on retire tout élément ajouté hors de l'appli qui
// pointe vers netlify.com (il recouvrait la barre de navigation).
export default defineNuxtPlugin(() => {
  const isBadge = (el: Element) => {
    if (el.id === "__nuxt" || el.tagName === "SCRIPT" || el.tagName === "STYLE") return false;
    const text = (el.textContent || "").toLowerCase();
    const link = el.matches?.('a[href*="netlify"]') || !!el.querySelector?.('a[href*="netlify"]');
    return link || text.includes("powered by netlify");
  };
  const sweep = () => {
    for (const el of Array.from(document.body.children)) if (isBadge(el)) el.remove();
  };
  sweep();
  new MutationObserver(sweep).observe(document.body, { childList: true });
});
