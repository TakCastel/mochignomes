// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // le composant historique de la scène 3D garde son nom d'un seul mot
  { files: ['components/Tamagotchi.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
)
