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
    serverBundle: { collections: ["ph", "solar"] },
    clientBundle: {
      scan: true,
      icons: [
        "ph:house-fill", "ph:bell-fill", "ph:backpack-fill", "ph:disco-ball-fill", "ph:sun-fill",
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
        "solar:donut-bitten-bold-duotone", "solar:bath-bold-duotone", "solar:football-bold-duotone", "solar:hand-heart-bold-duotone", "solar:bed-bold-duotone", "solar:medical-kit-bold-duotone", "solar:music-notes-bold-duotone", "solar:camera-bold-duotone", "solar:sun-bold-duotone", "solar:waterdrop-bold-duotone", "solar:bolt-bold-duotone", "solar:heart-bold-duotone", "solar:leaf-bold-duotone", "solar:bell-bing-bold-duotone", "solar:users-group-two-rounded-bold-duotone", "solar:settings-bold-duotone", "solar:home-2-bold-duotone", "solar:calendar-bold-duotone", "solar:stars-bold-duotone", "solar:gallery-bold-duotone", "solar:chart-2-bold-duotone", "solar:pen-bold", "solar:home-2-linear", "solar:calendar-bold", "solar:gallery-bold", "solar:chart-2-bold", "solar:stars-bold", "solar:bell-bold", "solar:users-group-two-rounded-bold", "solar:settings-bold", "solar:lock-keyhole-bold",
        "ph:bowl-food-duotone", "ph:bathtub-duotone", "ph:soccer-ball-duotone", "ph:hand-heart-duotone",
        "ph:bed-duotone", "ph:first-aid-kit-duotone", "ph:music-notes-duotone", "ph:camera-duotone",
        "ph:sun-duotone", "ph:drop-duotone", "ph:lightning-duotone", "ph:heart-duotone",
        "ph:bell-duotone", "ph:users-duotone", "ph:gear-six-duotone", "ph:pencil-simple-fill", "ph:plant-fill",
        "ph:house-bold", "ph:calendar-dots-fill", "ph:images-fill", "ph:chart-bar-fill", "ph:bell-fill", "ph:users-fill",
        "ph:bed-fill", "ph:first-aid-kit-fill", "ph:camera-fill",
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
