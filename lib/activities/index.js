// lib/activities/index.js : registre et lanceur des activités 3D.
//
// Contrat d'un module d'activité (lib/activities/<id>.js) :
//   export default { id, start(ctx) } ; start(ctx) renvoie { tap(ndcX, ndcY, ev), pause(), resume(), stop() }
//   ctx = { creature, THREE, container, store, inventory, tastes, feel, say, haptic, beep,
//           setScore(n), setHud({ text?, timeLeft?, combo? }), end(result) }
//     creature : l'objet de createCreature (three, onFrame, anchor, setPuppet, setCamera, setInputEnabled, say)
//     feel     : store.playFeel() -> { hitWindow, clumsy } (traits, humeur, stade)
//     result   : { score, details?, ingredients?: { id: n }, channel? (télé) }
//   tap : ev = { type: "tap" } au pointerdown (réactif pour le timing),
//         puis au pointerup : ev = { type: "swipe", dx, dy, speed } si le doigt a glissé (>= 28 px ;
//         dx, dy en pixels écran, dy > 0 vers le bas ; speed en px/ms, coordonnées = point de départ),
//         sinon ev = { type: "tapend", dt } (toucher bref relâché ; utile quand un swipe peut suivre,
//         ex. viser au foot : agir sur "tapend"/"swipe" plutôt que sur "tap").
//   stop() retire tous les maillages et écouteurs ; le lanceur rétablit ensuite, dans un finally,
//   setPuppet(null), setCamera(null) et setInputEnabled(true).
//
// runActivity(id, opts) -> contrôleur { tap, pause, resume, abort, running }
//   opts = { creature, container, store, inventory, say?, haptic?, beep?, onScore?, onHud?, onEnd(result) }
//   abort() : interruption (fermeture, navigation) ; termine la partie avec le dernier score connu
//   (setScore) pour qu'aucune récompense ne soit perdue : onEnd reçoit { ..., interrupted: true }.
import * as THREE from "three";
import foot from "./foot.js";
import course from "./course.js";
import tele from "./tele.js";

export const ACTIVITY_MODULES = { foot, course, tele };

export function runActivity(id, opts) {
  const mod = ACTIVITY_MODULES[id];
  const { creature, store, inventory } = opts;
  if (!mod || !creature) return null;

  let lastScore = 0;
  let finished = false;
  let instance = null;
  let tastes = null;
  let feel = { hitWindow: 1, clumsy: 0 };
  try { tastes = store?.tastes || null; } catch { /* store absent */ }
  try { feel = store?.playFeel?.() || feel; } catch { /* store absent */ }

  function cleanup() {
    try { instance?.stop?.(); } catch (e) { console.error("[activité] stop", e); }
    finally {
      instance = null;
      try { creature.setPuppet(null); } catch { /* ignoré */ }
      try { creature.setCamera(null); } catch { /* ignoré */ }
      try { creature.setInputEnabled(true); } catch { /* ignoré */ }
    }
  }

  function finish(result, interrupted = false) {
    if (finished) return;
    finished = true;
    const res = { score: lastScore, ...(result || {}) };
    if (interrupted) res.interrupted = true;
    res.score = Math.max(0, Math.round(Number(res.score) || 0));
    cleanup();
    try { opts.onEnd?.(res); } catch (e) { console.error("[activité] onEnd", e); }
  }

  const ctx = {
    creature,
    THREE,
    container: opts.container || creature.three?.renderer?.domElement?.parentElement || null,
    store,
    inventory,
    tastes,
    feel,
    say: (text, ms) => { try { (opts.say || creature.say)?.(text, ms); } catch { /* ignoré */ } },
    haptic: (p) => opts.haptic?.(p),
    beep: (k) => opts.beep?.(k),
    setScore: (n) => { lastScore = Number(n) || 0; opts.onScore?.(lastScore); },
    setHud: (h) => opts.onHud?.(h),
    end: (result) => finish(result, false),
  };

  creature.setInputEnabled(false);
  try {
    instance = mod.start(ctx);
  } catch (e) {
    console.error("[activité] start", e);
    finish({ score: 0, error: true }, true);
    return null;
  }

  return {
    get running() { return !finished; },
    tap(x, y, ev) { if (!finished) { try { instance?.tap?.(x, y, ev); } catch (e) { console.error("[activité] tap", e); } } },
    pause() { if (!finished) instance?.pause?.(); },
    resume() { if (!finished) instance?.resume?.(); },
    abort() { finish(null, true); },
  };
}
