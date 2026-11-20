<template>
  <!-- Illustrations des actions : petits objets en relief, dessinés en SVG -->
  <svg viewBox="0 0 64 64" class="art" aria-hidden="true">
    <defs>
      <linearGradient id="aa-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f4f6f8" /><stop offset=".5" stop-color="#c3cad3" /><stop offset="1" stop-color="#8d96a3" />
      </linearGradient>
      <linearGradient id="aa-metal-rim" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#aab3bf" /><stop offset=".5" stop-color="#eef1f4" /><stop offset="1" stop-color="#9aa3af" />
      </linearGradient>
      <radialGradient id="aa-kibble" cx=".35" cy=".3" r=".8">
        <stop offset="0" stop-color="#d98a3d" /><stop offset="1" stop-color="#7a3f12" />
      </radialGradient>
      <linearGradient id="aa-tub" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" /><stop offset="1" stop-color="#cbd8e6" />
      </linearGradient>
      <radialGradient id="aa-bubble" cx=".35" cy=".3" r=".8">
        <stop offset="0" stop-color="#ffffff" /><stop offset=".5" stop-color="#a9dcff" /><stop offset="1" stop-color="#4aa6f0" />
      </radialGradient>
      <radialGradient id="aa-ball" cx=".38" cy=".32" r=".75">
        <stop offset="0" stop-color="#ffffff" /><stop offset=".7" stop-color="#eef1f4" /><stop offset="1" stop-color="#b9c1cb" />
      </radialGradient>
      <linearGradient id="aa-skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffdcb4" /><stop offset="1" stop-color="#f0b27a" />
      </linearGradient>
      <radialGradient id="aa-heart" cx=".35" cy=".3" r=".85">
        <stop offset="0" stop-color="#ff8fa6" /><stop offset=".6" stop-color="#f03a5f" /><stop offset="1" stop-color="#c41d44" />
      </radialGradient>
      <linearGradient id="aa-blue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#7d9cf0" /><stop offset="1" stop-color="#3c5bc4" />
      </linearGradient>
      <linearGradient id="aa-kit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f7f8fa" /><stop offset="1" stop-color="#b8c0ca" />
      </linearGradient>
      <linearGradient id="aa-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff5a52" /><stop offset="1" stop-color="#d11f1f" />
      </linearGradient>
      <linearGradient id="aa-purple" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d59cff" /><stop offset="1" stop-color="#7b3fe0" />
      </linearGradient>
      <linearGradient id="aa-teal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5fd8d0" /><stop offset="1" stop-color="#159088" />
      </linearGradient>
      <radialGradient id="aa-lens" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#7fb4ff" /><stop offset=".55" stop-color="#1d3f7a" /><stop offset="1" stop-color="#0b1a33" />
      </radialGradient>
      <radialGradient id="aa-sun" cx=".4" cy=".35" r=".7">
        <stop offset="0" stop-color="#fff3a8" /><stop offset=".6" stop-color="#ffc21a" /><stop offset="1" stop-color="#f29200" />
      </radialGradient>
    </defs>

    <!-- gamelle de croquettes -->
    <g v-if="name === 'nourrir'">
      <ellipse cx="32" cy="50" rx="25" ry="5" fill="#000" opacity=".1" />
      <path d="M6 31h52l-5 15c-1 3-4 5-8 5H19c-4 0-7-2-8-5z" fill="url(#aa-metal)" />
      <circle cx="17" cy="29" r="5" fill="url(#aa-kibble)" /><circle cx="26" cy="27" r="5.5" fill="url(#aa-kibble)" />
      <circle cx="36" cy="27" r="5.5" fill="url(#aa-kibble)" /><circle cx="46" cy="29" r="5" fill="url(#aa-kibble)" />
      <circle cx="22" cy="23" r="4.5" fill="url(#aa-kibble)" /><circle cx="31" cy="21" r="5" fill="url(#aa-kibble)" />
      <circle cx="40" cy="23" r="4.5" fill="url(#aa-kibble)" />
      <ellipse cx="32" cy="31" rx="27" ry="4.5" fill="none" stroke="url(#aa-metal-rim)" stroke-width="3.5" />
    </g>

    <!-- baignoire et bulles -->
    <g v-else-if="name === 'laver'">
      <ellipse cx="32" cy="55" rx="24" ry="3.5" fill="#000" opacity=".1" />
      <rect x="15" y="47" width="5" height="8" rx="2" fill="#9aa8b8" /><rect x="44" y="47" width="5" height="8" rx="2" fill="#9aa8b8" />
      <path d="M6 32h52v6c0 7-6 12-13 12H19c-7 0-13-5-13-12z" fill="url(#aa-tub)" stroke="#b9c7d6" stroke-width="1.5" />
      <rect x="4" y="29" width="56" height="5" rx="2.5" fill="#e9eff6" stroke="#b9c7d6" stroke-width="1.2" />
      <circle cx="20" cy="25" r="6" fill="url(#aa-bubble)" /><circle cx="30" cy="22" r="7.5" fill="url(#aa-bubble)" />
      <circle cx="41" cy="24" r="6.5" fill="url(#aa-bubble)" /><circle cx="35" cy="12" r="4" fill="url(#aa-bubble)" />
      <circle cx="44" cy="8" r="3" fill="url(#aa-bubble)" /><circle cx="25" cy="13" r="2.5" fill="url(#aa-bubble)" />
    </g>

    <!-- ballon de foot -->
    <g v-else-if="name === 'jouer'">
      <ellipse cx="32" cy="57" rx="18" ry="3.5" fill="#000" opacity=".12" />
      <circle cx="32" cy="31" r="24" fill="url(#aa-ball)" />
      <path d="M32 21l8 6-3 9h-10l-3-9z" fill="#2b2f36" />
      <path d="M32 7.5c-4 0-8 1-11.5 3l2 5 9.5-1 9.5 1 2-5C40 8.5 36 7.5 32 7.5z" fill="#2b2f36" />
      <path d="M9 24c-1 3-1.5 6-1 9l5 3 4-8-2-6z" fill="#2b2f36" />
      <path d="M55 24c1 3 1.5 6 1 9l-5 3-4-8 2-6z" fill="#2b2f36" />
      <path d="M20 47l4-7h16l4 7c-3 3-7 5-12 5s-9-2-12-5z" fill="#2b2f36" />
      <g stroke="#2b2f36" stroke-width="1.6" fill="none">
        <path d="M32 21v-6.5M40 27l7-1M37 36l6 5M27 36l-6 5M24 27l-7-1" />
      </g>
      <ellipse cx="23" cy="18" rx="6" ry="3.5" fill="#fff" opacity=".7" transform="rotate(-30 23 18)" />
    </g>

    <!-- main qui offre un cœur -->
    <g v-else-if="name === 'calin'">
      <path d="M32 33c-6-5-14-10-14-17 0-4 3-7 7-7 3 0 5 2 7 4 2-2 4-4 7-4 4 0 7 3 7 7 0 7-8 12-14 17z" fill="url(#aa-heart)" />
      <ellipse cx="25" cy="14" rx="3.5" ry="2" fill="#fff" opacity=".6" transform="rotate(-30 25 14)" />
      <path d="M4 46c6-4 12-6 18-5l14 2c3 .5 3.5 4 .5 5l-9 1h12l12-6c3-1.5 6 1 4 4L44 56c-3 2-6 3-10 3H18c-5 0-9-1-14-3z" fill="url(#aa-skin)" stroke="#d9925a" stroke-width="1.3" stroke-linejoin="round" />
    </g>

    <!-- lit et zzz -->
    <g v-else-if="name === 'coucher'">
      <ellipse cx="32" cy="57" rx="27" ry="3" fill="#000" opacity=".1" />
      <rect x="4" y="28" width="6" height="28" rx="2.5" fill="url(#aa-blue)" />
      <rect x="54" y="38" width="6" height="18" rx="2.5" fill="url(#aa-blue)" />
      <rect x="8" y="42" width="48" height="8" rx="2" fill="#3c5bc4" />
      <rect x="11" y="33" width="14" height="9" rx="4" fill="#fff" stroke="#c9d3e6" stroke-width="1.2" />
      <path d="M22 34h30c3 0 5 2 5 5v4H22z" fill="url(#aa-blue)" />
      <text x="26" y="24" font-family="Fredoka, Nunito, sans-serif" font-weight="800" font-size="11" fill="#3c5bc4">z</text>
      <text x="33" y="18" font-family="Fredoka, Nunito, sans-serif" font-weight="800" font-size="14" fill="#3c5bc4">z</text>
      <text x="42" y="11" font-family="Fredoka, Nunito, sans-serif" font-weight="800" font-size="17" fill="#3c5bc4">z</text>
    </g>

    <!-- réveil : soleil -->
    <g v-else-if="name === 'reveil'">
      <g stroke="#ffb000" stroke-width="4" stroke-linecap="round">
        <path d="M32 4v7M32 53v7M4 32h7M53 32h7M12 12l5 5M47 47l5 5M12 52l5-5M47 17l5-5" />
      </g>
      <circle cx="32" cy="32" r="15" fill="url(#aa-sun)" />
    </g>

    <!-- trousse de secours -->
    <g v-else-if="name === 'soigner'">
      <ellipse cx="32" cy="56" rx="25" ry="3" fill="#000" opacity=".1" />
      <path d="M23 18v-5c0-2 1.5-3 3-3h12c1.5 0 3 1 3 3v5" fill="none" stroke="#7d8794" stroke-width="4" />
      <rect x="6" y="17" width="52" height="37" rx="8" fill="url(#aa-kit)" stroke="#9ea8b4" stroke-width="1.2" />
      <rect x="6" y="17" width="52" height="7" rx="4" fill="#fff" opacity=".6" />
      <path d="M27 25h10v8h8v10h-8v8H27v-8h-8V33h8z" fill="url(#aa-red)" />
    </g>

    <!-- notes de musique -->
    <g v-else-if="name === 'danser'">
      <path d="M24 14l28-7v34" fill="none" stroke="url(#aa-purple)" stroke-width="5" stroke-linejoin="round" />
      <path d="M24 14v34" stroke="url(#aa-purple)" stroke-width="5" />
      <path d="M24 14l28-7v8l-28 7z" fill="url(#aa-purple)" />
      <ellipse cx="17" cy="48" rx="9" ry="7" fill="url(#aa-purple)" transform="rotate(-20 17 48)" />
      <ellipse cx="45" cy="42" rx="9" ry="7" fill="url(#aa-purple)" transform="rotate(-20 45 42)" />
      <ellipse cx="14" cy="45" rx="3" ry="1.8" fill="#fff" opacity=".55" transform="rotate(-20 14 45)" />
      <ellipse cx="42" cy="39" rx="3" ry="1.8" fill="#fff" opacity=".55" transform="rotate(-20 42 39)" />
    </g>

    <!-- appareil photo -->
    <g v-else-if="name === 'photo'">
      <ellipse cx="32" cy="57" rx="25" ry="3" fill="#000" opacity=".1" />
      <path d="M22 17l3-6h14l3 6z" fill="#127c75" />
      <rect x="5" y="16" width="54" height="38" rx="9" fill="url(#aa-teal)" />
      <rect x="5" y="16" width="54" height="8" rx="5" fill="#fff" opacity=".25" />
      <circle cx="32" cy="36" r="13" fill="#e9f7f6" />
      <circle cx="32" cy="36" r="10" fill="url(#aa-lens)" />
      <circle cx="28.5" cy="32.5" r="3" fill="#fff" opacity=".75" />
      <circle cx="50" cy="24" r="2.5" fill="#ffe27a" />
    </g>
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } });
</script>

<style scoped>
.art { display: block; overflow: visible; }
</style>
