<template>
  <!-- barre de raccourcis : Manger, Jouer, Dodo + Photo. Le reste des actions s'ouvre en touchant la créature.
       Pendant le tutoriel, la liste complète revient (3 colonnes). -->
  <section class="panel" :class="{ full: !tutoDone }" aria-label="Actions">
    <button
      v-for="(a, i) in list"
      :key="a.key"
      class="act"
      :style="{ '--i': i, '--c1': a.color[0], '--c2': a.color[1] }"
      :class="{
        best: primary?.kind === 'best' && primary.key === a.key,
        wanted: primary?.kind === 'wanted' && primary.key === a.key,
        glow: a.glow,
        off: !!a.reason,
        cooling: !!a.cool,
        wiggle: wiggling === a.key,
      }"
      :aria-label="a.label + (a.reason ? ` (${a.reason})` : primary?.key === a.key ? (primary.kind === 'wanted' ? ' (elle en a envie)' : ' (conseillé)') : '')"
      @click="press(a)"
    >
      <span class="pill">
        <span v-if="a.cool" :key="a.cool.readyAt" class="cool-fill" :style="a.cool.style" aria-hidden="true" />
        <span class="lbl">{{ a.label }}</span>
      </span>
      <span class="obj">
        <img v-if="a.img" :src="a.img" class="emoji" alt="" draggable="false" />
        <Icon v-else :name="a.icon" mode="svg" class="ic" />
      </span>
      <Icon v-if="a.locked" name="solar:lock-keyhole-bold" class="lock" />
      <span v-if="primary?.kind === 'wanted' && primary.key === a.key" class="dot" aria-hidden="true" />
      <span v-for="f in floats.filter((x) => x.key === a.key)" :key="f.id" class="float" :style="{ '--fx': f.dx + 'px' }">{{ f.text }}</span>
    </button>
    <button v-if="tutoDone" class="photo" type="button" aria-label="Photo" @click="press(photo)">
      <img :src="photo.img" class="emoji" alt="" draggable="false" />
    </button>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { useActionList } from "~/composables/useActionList";

const { actions, shownActions, primary, press, wiggling, floats, tutoDone } = useActionList();

const SHORTCUTS = ["nourrir", "jouer", "coucher"];
const photo = computed(() => actions.value.find((a) => a.key === "photo"));
// raccourcis (ordre fixe) ; pendant le tutoriel : toute la liste sauf Chatouiller et Photo (gérés ailleurs)
const list = computed(() => {
  const shown = shownActions.value;
  if (!tutoDone.value) return shown.filter((a) => a.key !== "chatouiller");
  return SHORTCUTS.map((k) => shown.find((a) => a.key === k)).filter(Boolean);
});
</script>

<style scoped>
/* panneau blanc net, 3 pilules par rangée (une rangée incomplète se centre) */
.panel {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, var(--surface), var(--hud-band));
  box-shadow: var(--hud-shadow), 0 0 0 1px var(--hud-line);
  animation: panel-in 0.5s var(--spring) 0.08s both;
}
.panel.full { flex-wrap: wrap; justify-content: center; gap: 10px 8px; }
@keyframes panel-in { from { opacity: 0; transform: translateY(18px); } }

/* une action : l'objet 3D à gauche, posé à cheval sur une pilule blanche */
.act {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 46px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  animation: act-in 0.45s var(--spring-strong) calc(0.15s + var(--i, 0) * 40ms) both;
}
@keyframes act-in { from { opacity: 0; transform: scale(0.6) translateY(8px); } }
.pill {
  position: absolute;
  left: 16px;
  right: 0;
  top: 5px;
  bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 6px 0 24px;
  border-radius: 999px;
  background: var(--hud-pill);
  box-shadow: var(--hud-pill-shadow), inset 0 1px 0 #fff;
  transition: transform 0.4s var(--spring-strong), box-shadow 0.2s, background 0.2s;
}
.lbl {
  position: relative;
  z-index: 1;
  min-width: 0;
  font: 800 clamp(11px, 3.1vw, 13px)/1 var(--font-text);
  color: var(--hud-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.obj {
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  margin-top: -20px;
  pointer-events: none;
  transition: transform 0.45s var(--spring-strong);
}
/* objet 3D détouré d'un contour blanc façon autocollant */
.emoji {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  filter:
    drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff)
    drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff)
    drop-shadow(0 3px 3px rgba(30, 55, 100, 0.28));
}
.ic { width: 32px; height: 32px; color: var(--c2); filter: drop-shadow(0 0 2px #fff) drop-shadow(0 2px 2px rgba(30, 55, 100, 0.25)); }
.ic :deep([opacity]) { opacity: 1; color: var(--c1); }

/* toucher : la pilule s'écrase, l'objet saute ; retour en rebond */
.act:active .pill { transform: scale(0.93); transition-duration: 0.08s; }
.act:active .obj { transform: scale(1.15) rotate(-8deg); transition-duration: 0.1s; }
@media (hover: hover) {
  .act:hover .pill { background: var(--hud-pill-hover); }
  .act:hover .obj { transform: translateY(-2px) rotate(-5deg); }
}

/* recharge : la pilule se remplit de bleu clair, en continu, de gauche à droite
   (durée = recharge totale, délai négatif = temps déjà écoulé) */
@property --p {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
.cool-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(108, 194, 255, 0.42) calc(var(--p) * 100%), transparent 0);
  pointer-events: none;
  animation: cool var(--dur, 1s) linear var(--delay, 0s) forwards;
}
@keyframes cool {
  from { --p: 0; }
  to { --p: 1; }
}

/* action conseillée : liseré bleu ciel lumineux qui respire */
.best .pill { animation: halo 1.8s ease-in-out infinite; }
@keyframes halo {
  0%, 100% { box-shadow: 0 0 0 2.5px var(--sky-hi), 0 0 8px 2px rgba(108, 194, 255, 0.55), var(--hud-pill-shadow); }
  50% { box-shadow: 0 0 0 2.5px var(--sky-hi), 0 0 16px 6px rgba(108, 194, 255, 0.35), var(--hud-pill-shadow); }
}
/* envie de la créature : pilule rose qui pulse */
.wanted .pill {
  background: linear-gradient(180deg, color-mix(in srgb, #fff7fa var(--tint), var(--surface)), color-mix(in srgb, #ffe6ee var(--tint), var(--surface)));
  box-shadow: 0 0 0 2.5px #ff9ab8, 0 4px 10px rgba(255, 79, 134, 0.25);
}
.wanted { animation: act-in 0.45s var(--spring-strong) calc(0.15s + var(--i, 0) * 40ms) both, pulse 1.3s ease-in-out 0.8s infinite; }
.wanted .lbl { color: var(--love-ink); }
.glow .pill { box-shadow: 0 0 0 2.5px #ffc21a, 0 0 12px rgba(255, 194, 26, 0.6); }
.glow { animation: pulse 0.9s ease-in-out 3; }
@keyframes pulse { 50% { transform: scale(1.06); } }
.dot { position: absolute; z-index: 3; top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 50%; background: var(--love); box-shadow: 0 0 0 2px var(--surface); }

/* indisponible : texte bleu pâle, objet un peu éteint, mais toujours lisible */
.off .lbl { color: var(--hud-ink-2); }
.off .obj { filter: saturate(0.35); opacity: 0.75; }
.off .pill { background: linear-gradient(180deg, var(--surface-2), var(--surface-3)); }

/* petits « +N » qui sautent puis montent depuis l'action */
.float {
  position: absolute;
  top: -4px;
  left: 50%;
  z-index: 5;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface);
  color: #2a9a3a;
  font: 800 13px var(--font-title);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 2px 6px rgba(30, 55, 100, 0.22);
  animation: up 1.05s ease-out forwards;
}
@keyframes up {
  0% { transform: translate(calc(-50% + var(--fx)), 6px) scale(0.4); opacity: 0; }
  18% { transform: translate(calc(-50% + var(--fx)), -14px) scale(1.25); opacity: 1; }
  30% { transform: translate(calc(-50% + var(--fx)), -18px) scale(1); }
  75% { opacity: 1; }
  100% { transform: translate(calc(-50% + var(--fx)), -58px) scale(0.95); opacity: 0; }
}
.lock { position: absolute; z-index: 3; top: 2px; right: 4px; width: 14px; height: 14px; color: #9aa4b2; }
.full .act { flex: 0 0 calc((100% - 2 * 8px) / 3); }

/* Photo : bouton rond blanc */
.photo {
  flex: 0 0 46px;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--hud-pill);
  box-shadow: var(--hud-pill-shadow), inset 0 1px 0 #fff;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.4s var(--spring-strong);
  animation: act-in 0.45s var(--spring-strong) 0.3s both;
}
.photo .emoji { width: 32px; height: 32px; }
.photo:active { transform: scale(0.9); transition-duration: 0.08s; }
.wiggle { animation: wiggle 0.4s ease-in-out; }
@keyframes wiggle {
  20% { transform: rotate(-5deg); }
  40% { transform: rotate(4deg); }
  60% { transform: rotate(-3deg); }
  80% { transform: rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .panel, .act, .photo, .wanted, .glow, .wiggle, .best .pill { animation: none; }
  .best .pill { box-shadow: 0 0 0 2.5px var(--sky-hi), var(--hud-pill-shadow); }
  .pill, .obj, .photo { transition: none; }
}
</style>
