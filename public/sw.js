// Service worker : cache de l'appli, notifications locales (aucun serveur push).
const CACHE = "tamagotchi-v7";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Réseau d'abord, cache en secours (hors ligne)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || /\.(js|css|png|webp|woff2?|svg)$/.test(req.url))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
  );
});

function show({ title, body, tag }) {
  return self.registration.showNotification(title || "Mochignomes", {
    body: body || "",
    tag: tag || "tamagotchi",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: "fr",
  });
}

self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "notify") e.waitUntil(show(d));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    }),
  );
});

// Periodic Background Sync (Chrome/Edge, appli installée, non garanti)
self.addEventListener("periodicsync", (e) => {
  if (e.tag !== "tamagotchi-bonjour") return;
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      if (list.length) return; // appli ouverte : pas de rappel
      return show({ title: "Des nouvelles du pré", body: "Elle aimerait un petit coucou quand tu as une minute.", tag: "tamagotchi-bonjour" });
    }),
  );
});
