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
    clientBundle: {
      scan: true,
      icons: [
        "ph:bowl-food-fill", "ph:bathtub-fill", "ph:drop-fill", "ph:soccer-ball-fill",
        "ph:lightning-fill", "ph:heart-fill", "ph:hand-heart-fill", "ph:moon-stars-fill",
        "ph:sun-fill", "ph:music-notes-fill", "ph:syringe-fill", "ph:camera-fill",
        "ph:sparkle-fill", "ph:images-fill", "ph:trophy-fill", "ph:calendar-fill",
        "ph:gear-six-fill", "ph:star-fill",
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
