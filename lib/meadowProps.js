// lib/meadowProps.js : les objets d'activité possédés restent posés dans le pré.
//   ballon -> un ballon dans l'herbe ; tele -> une télé et un petit canapé sur le côté.
// Toucher un objet lance son activité (raycast) ; au repos, elle va d'elle-même pousser le ballon
// ou s'asseoir devant la télé (marionnette brève, jamais contre un geste du joueur), et le journal
// le raconte quelques fois par jour.
//
//   const meadow = bindMeadowProps(creature, { onLaunch(activityId), store?, inventory? })
//   meadow.sync()     relit les objets possédés tout de suite (sinon toutes les 0,5 s)
//   meadow.dispose()  retire maillages et écouteurs
//
// Les objets se cachent et la vie spontanée se tait tant qu'une activité tourne
// (activeActivity de composables/useLiveCreature), ou qu'une page / fenêtre est ouverte.
import { propById } from "~/lib/catalog";
import { activeActivity } from "~/composables/useLiveCreature";
import { gameBus } from "~/composables/useCreatureMood";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { useInventoryStore } from "~/stores/useInventoryStore";
import { RENDER_STYLE, USE_STUDIO } from "~/lib/world3d.js";
import { createScreen, makeTv, makeSofa, TV_CHANNELS } from "~/lib/activities/tele.js";

const BALL_R = 0.2;
const BALL_HOME = [0.85, 1.45];
const TV_POS = [-1.15, -2.3];
// assez près du centre pour rester visibles sur un téléphone étroit (demi-largeur visible ≈ 3 à z≈-1)
const SOFA_POS = [-1.75, -0.95];
const IDLE_QUIET = 12; // secondes sans geste avant qu'elle joue seule
const LOG_KEY = "tamagotchi-idle-log";
const LOG_MAX = 2; // entrées de journal par type et par jour
const STAGE_SCALE = { bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };

function ballTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 64);
  g.fillStyle = "#2b3440";
  const spots = [[16, 32], [48, 14], [48, 50], [80, 32], [112, 14], [112, 50], [0, 10], [128, 10]];
  for (const [x, y] of spots) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function logIdle(store, kind, text, icon) {
  let log = { day: "", ball: 0, tv: 0 };
  const day = new Date().toDateString();
  try { log = JSON.parse(localStorage.getItem(LOG_KEY) || "null") || log; } catch { /* ignoré */ }
  if (log.day !== day) log = { day, ball: 0, tv: 0 };
  if ((log[kind] || 0) >= LOG_MAX) return;
  log[kind] = (log[kind] || 0) + 1;
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch { /* ignoré */ }
  try { store.addJournal("jeu", text, icon); } catch { /* ignoré */ }
}

export function bindMeadowProps(creature, opts = {}) {
  const { THREE, scene, camera, renderer } = creature.three;
  const store = opts.store || useTamagotchiStore();
  const inventory = opts.inventory || useInventoryStore();
  const el = renderer.domElement;

  // ---------- maillages ----------
  const root = new THREE.Group();
  root.name = "meadow-props";
  scene.add(root);

  const ballTex = ballTexture(THREE);
  const ballGeo = new THREE.SphereGeometry(BALL_R, 20, 14);
  // rendu doux : ballon en matière lisse et un peu brillante qui projette une ombre ; sinon toon comme avant
  const ballMat = RENDER_STYLE === "doux"
    ? new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.55, metalness: 0 })
    : new THREE.MeshToonMaterial({ map: ballTex });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  if (RENDER_STYLE === "doux") ball.castShadow = true;
  ball.userData.activity = propById("ballon")?.activity || "foot";
  const shadowGeo = new THREE.CircleGeometry(BALL_R * 1.1, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: RENDER_STYLE === "doux" ? 0.1 : 0.16, depthWrite: false });
  const ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
  ballShadow.rotation.x = -Math.PI / 2;
  const ballGroup = new THREE.Group();
  ballGroup.add(ball, ballShadow);
  ball.position.set(BALL_HOME[0], BALL_R, BALL_HOME[1]);
  ballShadow.position.set(BALL_HOME[0], 0.014, BALL_HOME[1]);
  root.add(ballGroup);

  const screen = createScreen(THREE, { w: 192, h: 144 });
  screen.off();
  const tv = makeTv(THREE, screen);
  tv.group.position.set(TV_POS[0], 0, TV_POS[1]);
  tv.group.rotation.y = Math.atan2(0.3 - TV_POS[0], 0.6 - TV_POS[1]);
  tv.group.scale.setScalar(0.85);
  const sofa = makeSofa(THREE);
  sofa.group.position.set(SOFA_POS[0], 0, SOFA_POS[1]);
  sofa.group.rotation.y = Math.atan2(TV_POS[0] - SOFA_POS[0], TV_POS[1] - SOFA_POS[1]);
  sofa.group.scale.setScalar(0.62);
  const tvGroup = new THREE.Group();
  tvGroup.add(tv.group, sofa.group);
  tvGroup.traverse((o) => {
    o.userData.activity = propById("tele")?.activity || "tele";
    // la télé et le canapé projettent une ombre sur le pré (rendu doux) ; ni les contours ni les surfaces transparentes
    if (RENDER_STYLE === "doux" && o.isMesh && !o.material?.transparent && !o.material?.isShaderMaterial) o.castShadow = true;
  });
  root.add(tvGroup);
  const tvFront = new THREE.Vector3(Math.sin(tv.group.rotation.y), 0, Math.cos(tv.group.rotation.y));

  // ---------- état ----------
  let t = 0, syncIn = 0, disposed = false;
  let lastInput = performance.now();
  let nextIdleAt = 18 + Math.random() * 20;
  let idle = null; // { kind, t0, ... }
  let screenOn = false;
  const ballVel = new THREE.Vector2();
  let ballReturn = false;
  const pose = { x: 0, y: 0, z: 0, yaw: 0, posture: "stand", arms: "rest", motion: "walk", face: null, lockSpin: true };

  function sync() {
    const owned = inventory.props || [];
    ballGroup.visible = owned.includes("ballon");
    tvGroup.visible = owned.includes("tele");
    // vue studio : le pré n'est pas à l'écran, donc objets cachés et jamais touchables (onUp vérifie root.visible)
    root.visible = !USE_STUDIO && !activeActivity.value;
  }
  sync();

  // ---------- vie spontanée ----------
  const awakeAndFree = () =>
    !activeActivity.value && !gameBus.page && !gameBus.sheet && !document.hidden &&
    store.hatched && !store.isSleeping && !store.exhausted && (store.onboardStep ?? 6) >= 6 &&
    performance.now() - lastInput > IDLE_QUIET * 1000;

  function startIdle() {
    const kinds = [];
    if (ballGroup.visible) kinds.push("ball");
    if (tvGroup.visible) kinds.push("tv");
    if (!kinds.length) return;
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const s = STAGE_SCALE[store.stage] ?? 1;
    if (kind === "ball") {
      // elle s'arrête un peu avant le ballon, côté pré
      const bx = ball.position.x, bz = ball.position.z;
      const len = Math.hypot(bx, bz) || 1;
      const reach = 0.55 + 0.75 * s;
      idle = { kind, t0: t, from: [0, 0], to: [bx - (bx / len) * reach, bz - (bz / len) * reach], kicked: false };
    } else {
      const d = 1.0 + 0.6 * s;
      idle = { kind, t0: t, from: [0, 0], to: [TV_POS[0] + tvFront.x * d, TV_POS[1] + tvFront.z * d], ch: Math.floor(Math.random() * TV_CHANNELS.length) };
    }
    Object.assign(pose, { x: 0, z: 0, posture: "stand", arms: "rest", motion: "walk", face: null });
  }

  function stopIdle() {
    if (!idle) return;
    idle = null;
    creature.setPuppet(null);
    if (screenOn) { screenOn = false; screen.off(); }
    ballReturn = true;
  }

  function stepIdle() {
    const e = t - idle.t0;
    if (idle.kind === "ball") {
      if (e < 1.3) { // elle trottine jusqu'au ballon
        const k = e / 1.3;
        pose.x = idle.from[0] + (idle.to[0] - idle.from[0]) * k;
        pose.z = idle.from[1] + (idle.to[1] - idle.from[1]) * k;
        pose.yaw = Math.atan2(ball.position.x - pose.x, ball.position.z - pose.z);
        pose.motion = "walk";
      } else if (!idle.kicked) { // et pousse !
        idle.kicked = true;
        const a = Math.atan2(ball.position.x - pose.x, ball.position.z - pose.z) + (Math.random() - 0.5) * 1.6;
        const sp = 1.6 + Math.random() * 0.8;
        ballVel.set(Math.sin(a) * sp, Math.cos(a) * sp);
        ballReturn = false;
        pose.motion = "hop"; pose.arms = "up";
        pose.face = { eyes: "arc", brows: "raised", mouth: "laugh", extras: ["blush"] };
      } else if (e < 4) { // elle le regarde rouler
        pose.yaw = Math.atan2(ball.position.x - pose.x, ball.position.z - pose.z);
        if (e > 2.2) { pose.motion = "calm"; pose.arms = "rest"; }
      } else {
        logIdle(store, "ball", "Elle s'est amusée avec son ballon.", "ph:soccer-ball-fill");
        stopIdle();
        nextIdleAt = t + 40 + Math.random() * 50;
        return;
      }
    } else {
      if (e < 1.6) {
        const k = e / 1.6;
        pose.x = idle.from[0] + (idle.to[0] - idle.from[0]) * k;
        pose.z = idle.from[1] + (idle.to[1] - idle.from[1]) * k;
        pose.yaw = Math.atan2(TV_POS[0] - pose.x, TV_POS[1] - pose.z);
        pose.motion = "walk";
      } else if (e < 9) {
        if (pose.posture !== "sit") {
          pose.posture = "sit"; pose.motion = "calm";
          pose.face = { eyes: "shiny", brows: "neutral", mouth: "content" };
          screenOn = true;
        }
        screen.draw(idle.ch, t);
      } else {
        logIdle(store, "tv", "Elle s'est offert un petit moment télé.", "solar:tv-bold-duotone");
        stopIdle();
        nextIdleAt = t + 50 + Math.random() * 50;
        return;
      }
    }
    creature.setPuppet(pose);
  }

  // ---------- ballon qui roule ----------
  function stepBall(dt) {
    const sp = ballVel.length();
    if (sp > 0.01) {
      let nx = ball.position.x + ballVel.x * dt, nz = ball.position.z + ballVel.y * dt;
      // reste dans le pré visible
      if (Math.abs(nx) > 1.9) { ballVel.x *= -0.6; nx = Math.sign(nx) * 1.9; }
      if (nz > 2.1 || nz < -1.6) { ballVel.y *= -0.6; nz = Math.max(-1.6, Math.min(2.1, nz)); }
      // ne traverse pas la créature (rayon ~1 au centre)
      const d = Math.hypot(nx, nz);
      if (d < 1.15 && !idle) { nx *= 1.15 / d; nz *= 1.15 / d; ballVel.multiplyScalar(-0.5); }
      ball.rotation.x += (ballVel.y * dt) / BALL_R;
      ball.rotation.z -= (ballVel.x * dt) / BALL_R;
      ball.position.x = nx; ball.position.z = nz;
      ballVel.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
    } else if (ballReturn && !idle) {
      // retour tout doux à sa place
      const dx = BALL_HOME[0] - ball.position.x, dz = BALL_HOME[1] - ball.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.02) ballReturn = false;
      else {
        const step = Math.min(dist, 0.5 * dt);
        ball.position.x += (dx / dist) * step; ball.position.z += (dz / dist) * step;
        ball.rotation.x += (dz / dist) * step / BALL_R;
        ball.rotation.z -= (dx / dist) * step / BALL_R;
      }
    }
    ballShadow.position.x = ball.position.x; ballShadow.position.z = ball.position.z;
  }

  const offFrame = creature.onFrame((dt) => {
    if (disposed) return;
    t += dt;
    syncIn -= dt;
    if (syncIn <= 0) { syncIn = 0.5; sync(); }
    // activité en cours, ou vue studio (rien à pousser ni à regarder) : pas de vie spontanée autour des objets
    if (activeActivity.value || USE_STUDIO) { if (idle) { idle = null; if (screenOn) { screenOn = false; screen.off(); } } return; }
    if (idle) {
      if (store.isSleeping || gameBus.page || gameBus.sheet) stopIdle();
      else stepIdle();
    } else if (t > nextIdleAt) {
      if (awakeAndFree() && Math.random() < 0.6) startIdle();
      else nextIdleAt = t + 8 + Math.random() * 10;
    }
    if (ballGroup.visible) stepBall(dt);
  });

  // ---------- toucher un objet ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const targets = [];
  let down = null;
  function onDown(e) {
    lastInput = performance.now();
    if (idle) stopIdle(); // le joueur reprend la main tout de suite
    down = { x: e.clientX, y: e.clientY, t: lastInput };
  }
  let launchTimer = 0;
  function onUp(e) {
    if (creature.isGesture?.()) { clearTimeout(launchTimer); launchTimer = 0; down = null; return; }
    lastInput = performance.now();
    // un second toucher bref dans les 280 ms = double-tap (zoom) : pas de lancement
    if (launchTimer) { clearTimeout(launchTimer); launchTimer = 0; down = null; return; }
    const d = down; down = null;
    if (!d || activeActivity.value || !root.visible) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || lastInput - d.t > 450) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    targets.length = 0;
    if (ballGroup.visible) targets.push(ball);
    if (tvGroup.visible) targets.push(tvGroup);
    const hit = ray.intersectObjects(targets, true)[0];
    if (!hit) return;
    // la créature devant l'objet garde la priorité (poke)
    const her = ray.intersectObject(creature.three.char, true)[0];
    if (her && her.distance < hit.distance) return;
    const id = hit.object.userData.activity;
    if (id) {
      if (hit.object === ball) { ballVel.set((Math.random() - 0.5) * 0.8, -0.6); ballReturn = true; }
      // différé : un double-tap (zoom) l'annule
      launchTimer = setTimeout(() => {
        launchTimer = 0;
        if (disposed || creature.isGesture?.() || activeActivity.value) return;
        opts.onLaunch?.(id);
      }, 280);
    }
  }
  el.addEventListener("pointerdown", onDown, { passive: true });
  el.addEventListener("pointerup", onUp, { passive: true });

  return {
    sync,
    dispose() {
      if (disposed) return;
      disposed = true;
      offFrame();
      clearTimeout(launchTimer);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      if (idle) { idle = null; creature.setPuppet(null); }
      tv.dispose(); sofa.dispose(); screen.dispose();
      ballGeo.dispose(); ballMat.dispose(); ballTex.dispose(); shadowGeo.dispose(); shadowMat.dispose();
      root.removeFromParent();
    },
  };
}
