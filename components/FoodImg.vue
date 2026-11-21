<template>
  <!-- image Noto Emoji d'un plat ou d'un ingrédient (public/icons/food/<id>.svg), contour blanc façon
       autocollant ; taille en em pour remplacer l'emoji texte à l'identique ; repli sur l'emoji si l'image manque -->
  <img v-if="id && !failed" class="sticker food-img" :src="`/icons/food/${id}.svg`" alt="" draggable="false" @error="failed = true" />
  <span v-else>{{ emoji }}</span>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  id: { type: String, default: "" },
  emoji: { type: String, default: "" },
});
const failed = ref(false);
watch(() => props.id, () => { failed.value = false; });
</script>

<style scoped>
.food-img { width: 1.1em; height: 1.1em; object-fit: contain; vertical-align: middle; user-select: none; -webkit-user-drag: none; }
</style>
