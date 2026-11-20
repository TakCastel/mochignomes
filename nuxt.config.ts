// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: false },

  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
    "pinia-plugin-persistedstate/nuxt",
  ],

  app: {
    head: {
      title: "Tamagotchi",
      htmlAttrs: { lang: "fr" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#8fd3ff" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
      ],
    },
  },

  // Icônes embarquées dans l'appli : aucun appel réseau pour les afficher
  icon: {
    // le serveur n'embarque que les pictos ; les icônes en relief utilisées
    // partent dans le paquet du navigateur (liste ci-dessous + détection)
    serverBundle: { collections: ["ph"] },
    clientBundle: {
      scan: true,
      // les icônes en relief (dégradés) sont plus lourdes que les pictos
      sizeLimitKb: 600,
      icons: [
        "fluent-emoji:house", "fluent-emoji:star", "fluent-emoji:bell", "fluent-emoji:gear",
        "fluent-emoji:bread", "fluent-emoji:bubbles", "fluent-emoji:soccer-ball", "fluent-emoji:high-voltage",
        "fluent-emoji:red-heart", "fluent-emoji:bathtub", "fluent-emoji:crescent-moon", "fluent-emoji:sparkling-heart",
        "fluent-emoji:syringe", "fluent-emoji:sun-with-face", "fluent-emoji:backpack", "fluent-emoji:mirror-ball",
        "fluent-emoji:camera-with-flash", "fluent-emoji:framed-picture",
        "ph:caret-left-bold", "ph:caret-right-bold", "ph:lock-simple-fill",
        "ph:bowl-food-fill", "ph:bathtub-fill", "ph:drop-fill", "ph:soccer-ball-fill",
        "ph:lightning-fill", "ph:heart-fill", "ph:hand-heart-fill", "ph:moon-stars-fill",
        "ph:sun-fill", "ph:music-notes-fill", "ph:syringe-fill", "ph:camera-fill",
        "ph:sparkle-fill", "ph:images-fill", "ph:trophy-fill", "ph:calendar-fill",
        "ph:gear-six-fill", "ph:star-fill", "ph:book-open-text-fill",
        "ph:smiley-fill", "ph:smiley-sad-fill", "ph:smiley-angry-fill", "ph:smiley-nervous-fill",
        "ph:smiley-wink-fill", "ph:smiley-sticker-fill", "ph:smiley-x-eyes-fill", "ph:smiley-melting-fill",
        "ph:smiley-meh-fill", "ph:moon-fill", "ph:barbell-fill", "ph:cookie-fill", "ph:fire-fill",
        "ph:gift-fill", "ph:hand-waving-fill", "ph:chef-hat-fill", "ph:crown-fill", "ph:calendar-check-fill",
        "ph:egg-crack-fill",
      ],
    },
  },

  // Polices embarquées (pas d'appel à un service externe)
  css: [
    "@fontsource/fredoka/500.css",
    "@fontsource/fredoka/600.css",
    "@fontsource/fredoka/700.css",
    "@fontsource/nunito/600.css",
    "@fontsource/nunito/700.css",
    "@fontsource/nunito/800.css",
  ],
});
