// PWA : enregistrement du service worker et capture de l'invitation d'installation.
export default defineNuxtPlugin(() => {
  if (!("serviceWorker" in navigator)) return;
  const w = window as unknown as { __installPrompt: Event | null };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    w.__installPrompt = e;
    window.dispatchEvent(new Event("tamagotchi-installable"));
  });
  window.addEventListener("appinstalled", () => {
    w.__installPrompt = null;
    window.dispatchEvent(new Event("tamagotchi-installable"));
  });
  // pas de service worker en dev : il gênerait le rechargement à chaud
  if (import.meta.dev) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
});
