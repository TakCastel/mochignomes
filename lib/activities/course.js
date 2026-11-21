// lib/activities/course.js
// Mini-jeu « Course » : tapis roulant.
// Elle court sur place (x = 0 du chemin, z fixe) ; le chemin (4 tuiles), les obstacles,
// les pièces, les fruits et les arbres du bord défilent vers la caméra et bouclent.
// Le décor du pré reste figé. Toucher / glisser vers le haut = sauter ; glisser à gauche /
// à droite = changer de couloir (3 couloirs). 3 cœurs ; chaque obstacle touché en coûte un ;
// 10 pièces rendent un cœur. La vitesse augmente. Score = distance (m).
// Fruits ramassés -> result.ingredients ({ pomme, fraise, banane }).
// Difficulté : fatigue / humeur / trait « joueuse » (store.playFeel) jouent sur la tolérance
// des collisions et l'accélération ; un bébé court moins vite mais trébuche plus facilement.
//
// Contrat : export default { id, start(ctx) } -> { tap, pause, resume, stop }.
// Aucune allocation par image : InstancedMesh + pools préparés au démarrage. ~16 draw calls.

const STAGE_K = { bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };
const OUTLINE = "#5a2e14";
const Z0 = 4; // position de la coureuse (devant, le pré est dégagé)
const LANE = 1.25;
const TILE_L = 9, TILES = 4, TILE_W = 4.4;
const TILE_START = Z0 - 5; // bord arrière du chemin
const SPAWN_Z = Z0 + 30;
const DESPAWN_Z = Z0 - 3.5;
const JUMP_P = 0.45; // puissance du saut (creature.hop) : ~1 unité de haut
const HOP_T = 0.75; // durée d'un hop dans creature3d
const HEARTS = 3;
const VMAX = 17;
const MAX_T = 150; // au-delà : fin en beauté
const FRUITS = [
  { id: "pomme", label: "Pomme" },
  { id: "fraise", label: "Fraise" },
  { id: "banane", label: "Banane" },
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (cur, target, k) => cur + (target - cur) * k;
const laneX = (l) => -l * LANE; // l = -1 (gauche de l'écran), 0, 1 ; caméra derrière : droite écran = -x

// ---------------------------------------------------------------------
// Petits outils partagés (dupliqués dans foot.js : un fichier par activité)
// ---------------------------------------------------------------------
function toonGradient(THREE) {
  const tex = new THREE.DataTexture(new Uint8Array([95, 190, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

// contour « dessin animé » (faces arrière gonflées), compatible InstancedMesh
function outlineMaterial(THREE, thickness) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(OUTLINE) }, thickness: { value: thickness } },
    vertexShader: `
      uniform float thickness;
      void main() {
        vec4 p = vec4(position + normalize(normal) * thickness, 1.0);
        #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * p;
      }`,
    fragmentShader: `
      uniform vec3 color;
      void main() { gl_FragColor = vec4(color, 1.0); }`,
    side: THREE.BackSide,
  });
}

const FX_CSS = `
.actfx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4;
  font-family:"Fredoka","Nunito",system-ui,sans-serif;-webkit-user-select:none;user-select:none}
.actfx-pop{position:absolute;left:50%;top:50%;opacity:0;white-space:nowrap;font-weight:700;font-size:24px;
  color:#fff;text-shadow:0 2px 0 #3c9a22,0 0 2px #3c9a22,0 4px 10px rgba(43,52,64,.25);transform:translate(-50%,-50%)}
.actfx-pop.gold{color:#fff4b8;text-shadow:0 2px 0 #c98a00,0 0 2px #c98a00,0 0 14px rgba(255,210,63,.8)}
.actfx-pop.bad{text-shadow:0 2px 0 #c42a24,0 0 2px #c42a24,0 4px 10px rgba(43,52,64,.25)}
.actfx-pop.big{font-size:44px}
.actfx-pop.go{animation:actfx-pop .95s ease-out forwards}
.actfx-pop.big.go{animation-duration:1.1s}
@keyframes actfx-pop{0%{opacity:0;transform:translate(-50%,-30%) scale(.5)}
  14%{opacity:1;transform:translate(-50%,-50%) scale(1.18)}28%{transform:translate(-50%,-50%) scale(1)}
  70%{opacity:1}100%{opacity:0;transform:translate(-50%,-150%) scale(1)}}
.actfx-banner{position:absolute;left:50%;top:15%;max-width:86%;transform:translateX(-50%);opacity:0;text-align:center;
  background:#fff;color:#2b3440;border-radius:999px;padding:9px 18px;font-weight:600;font-size:16px;line-height:1.25;
  box-shadow:0 4px 0 #cfd9e4,0 8px 22px rgba(43,52,64,.12)}
.actfx-banner b{color:#3c9a22}
.actfx-banner.go{animation:actfx-banner 2.6s ease-out forwards}
@keyframes actfx-banner{0%{opacity:0;transform:translate(-50%,-8px)}10%{opacity:1;transform:translate(-50%,0)}
  85%{opacity:1}100%{opacity:0}}
.actfx-flash{position:absolute;inset:0;opacity:0;background:#fff}
.actfx-flash.go{animation:actfx-flash .55s ease-out}
@keyframes actfx-flash{0%{opacity:.8}100%{opacity:0}}
`;
function makeFx(container) {
  const root = document.createElement("div");
  root.className = "actfx";
  const style = document.createElement("style");
  style.textContent = FX_CSS;
  root.appendChild(style);
  const flashEl = document.createElement("div");
  flashEl.className = "actfx-flash";
  root.appendChild(flashEl);
  const bannerEl = document.createElement("div");
  bannerEl.className = "actfx-banner";
  root.appendChild(bannerEl);
  const pops = [];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement("div");
    el.className = "actfx-pop";
    root.appendChild(el);
    pops.push(el);
  }
  let next = 0;
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  container.appendChild(root);
  const replay = (el, cls) => {
    el.className = cls;
    void el.offsetWidth; // relance l'animation CSS
    el.classList.add("go");
  };
  return {
    pop(text, x, y, kind = "") {
      const el = pops[next];
      next = (next + 1) % pops.length;
      el.textContent = text;
      el.style.left = `${clamp(x, 0.08, 0.92) * 100}%`;
      el.style.top = `${clamp(y, 0.08, 0.92) * 100}%`;
      replay(el, `actfx-pop ${kind}`);
    },
    banner(html) {
      bannerEl.innerHTML = html;
      replay(bannerEl, "actfx-banner");
    },
    flash(color = "#fff") {
      flashEl.style.background = color;
      replay(flashEl, "actfx-flash");
    },
    dispose() { root.remove(); },
  };
}

// chemin de terre : 3 couloirs en pointillés, bords d'herbe, cailloux (boucle verticalement)
function pathTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#e7b877"; g.fillRect(0, 0, 256, 512);
  // taches de terre plus sombres / plus claires
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(176,120,62,0.22)" : "rgba(255,236,196,0.35)";
    const x = 24 + rnd() * 208, y = rnd() * 512, r = 4 + rnd() * 14;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill();
    if (y < r) { g.beginPath(); g.ellipse(x, y + 512, r, r * 0.6, 0, 0, Math.PI * 2); g.fill(); }
    if (y > 512 - r) { g.beginPath(); g.ellipse(x, y - 512, r, r * 0.6, 0, 0, Math.PI * 2); g.fill(); }
  }
  // pointillés entre couloirs
  g.fillStyle = "rgba(255,248,226,0.85)";
  for (const x of [256 * (1 / 2 - 1.25 / 4.4 / 2), 256 * (1 / 2 + 1.25 / 4.4 / 2)]) {
    for (let y = 0; y < 512; y += 64) { g.beginPath(); g.roundRect?.(x - 4, y + 10, 8, 34, 4); if (!g.roundRect) g.rect(x - 4, y + 10, 8, 34); g.fill(); }
  }
  // bords d'herbe ondulés
  g.fillStyle = "#5cc23e";
  for (const side of [0, 1]) {
    g.beginPath();
    const x0 = side ? 256 : 0, dir = side ? -1 : 1;
    g.moveTo(x0, 0);
    for (let y = 0; y <= 512; y += 16) g.lineTo(x0 + dir * (22 + Math.sin((y / 512) * Math.PI * 8) * 5), y);
    g.lineTo(x0, 512); g.closePath(); g.fill();
  }
  g.fillStyle = "#47a92e";
  for (const side of [0, 1]) g.fillRect(side ? 248 : 0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export default {
  id: "course",
  start(ctx) {
    const { creature } = ctx;
    const THREE = ctx.THREE || creature.three.THREE;
    const { scene, camera } = creature.three;
    const store = ctx.store || {};
    const stage = store.stage || "adulte";
    const sk = STAGE_K[stage] ?? 1;
    const feel = typeof store.playFeel === "function" ? store.playFeel() : { hitWindow: 1, clumsy: 0 };
    const hitWindow = clamp(feel.hitWindow ?? 1, 0.6, 1.5);
    const clumsy = clamp(feel.clumsy ?? 0, 0, 0.5);
    const best = ctx.inventory?.stats?.best?.course || 0;
    const loves = ctx.tastes?.activity === "course";
    const say = (s) => (ctx.say ? ctx.say(s) : creature.say?.(s));
    const beep = (k) => ctx.beep?.(k);
    const haptic = (p) => ctx.haptic?.(p);
    // tolérance des collisions : joueuse et en forme = plus indulgent ; bébé = trébuche plus
    const forgive = clamp(1.2 - 0.25 * hitWindow + clumsy * 0.3, 0.8, 1.15);
    const v0 = 7.2 * (1 - 0.3 * clumsy);
    const accel = 0.15 * (1.15 - 0.15 * hitWindow);

    // ------------------------------------------------------------------
    // Scène
    // ------------------------------------------------------------------
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const root = new THREE.Group();
    root.name = "activity-course";
    scene.add(root);
    const grad = keep(toonGradient(THREE));
    const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra }));
    const outline = keep(outlineMaterial(THREE, 0.03));
    const dummy = new THREE.Object3D();
    const meshes = [];
    // InstancedMesh (+ contour optionnel partageant les mêmes matrices)
    function inst(geo, mat, count, withOutline = false) {
      keep(geo);
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(m);
      if (withOutline) {
        const o = new THREE.InstancedMesh(geo, outline, count);
        o.instanceMatrix = m.instanceMatrix;
        o.frustumCulled = false;
        root.add(o);
      }
      // tout est caché au départ (échelle 0)
      dummy.position.set(0, -50, 0); dummy.scale.setScalar(0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
      for (let i = 0; i < count; i++) m.setMatrixAt(i, dummy.matrix);
      m.userData.dirty = true;
      meshes.push(m);
      return m;
    }
    function place(m, i, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rz = 0) {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, ry, rz);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.userData.dirty = true;
    }
    const hide = (m, i) => place(m, i, 0, -50, 0, 0, 0, 0, 0);

    // chemin
    const pathTex = keep(pathTexture(THREE));
    const tileGeo = new THREE.PlaneGeometry(TILE_W, TILE_L);
    tileGeo.rotateX(-Math.PI / 2);
    const tiles = inst(tileGeo, toon("#ffffff", { map: pathTex }), TILES);
    const tileZ = new Float32Array(TILES);
    for (let i = 0; i < TILES; i++) tileZ[i] = TILE_START + TILE_L / 2 + i * TILE_L;

    // bord : piquets de clôture et arbres
    const POSTS = 24, TREES = 14;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.6, 6);
    postGeo.translate(0, 0.3, 0);
    const posts = inst(postGeo, toon("#c08552"), POSTS);
    const postZ = new Float32Array(POSTS), postX = new Float32Array(POSTS);
    for (let i = 0; i < POSTS; i++) {
      postX[i] = (i % 2 ? 1 : -1) * (TILE_W / 2 + 0.25);
      postZ[i] = TILE_START + Math.floor(i / 2) * 3;
    }
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.95, 8);
    trunkGeo.translate(0, 0.47, 0);
    const trunks = inst(trunkGeo, toon("#9a5f34"), TREES);
    const crownGeo = new THREE.IcosahedronGeometry(0.8, 1);
    crownGeo.translate(0, 1.55, 0);
    const crowns = inst(crownGeo, toon("#ffffff"), TREES, true);
    const treeZ = new Float32Array(TREES), treeX = new Float32Array(TREES), treeS = new Float32Array(TREES);
    {
      const greens = ["#27c23a", "#1fa83f", "#4ad12c"].map((h) => new THREE.Color(h));
      for (let i = 0; i < TREES; i++) {
        const side = i % 2 ? 1 : -1;
        treeX[i] = side * (TILE_W / 2 + 1.1 + Math.random() * 1.6);
        treeZ[i] = TILE_START + Math.floor(i / 2) * (TILES * TILE_L / (TREES / 2)) + Math.random() * 2;
        treeS[i] = 0.8 + Math.random() * 0.5;
        crowns.setColorAt(i, greens[i % 3]);
      }
      crowns.instanceColor.needsUpdate = true;
    }

    // obstacles, pièces, fruits
    const stoneGeo = new THREE.DodecahedronGeometry(0.42, 0);
    const stones = inst(stoneGeo, toon("#b8b2c8"), 6, true);
    const logGeo = new THREE.CylinderGeometry(0.24, 0.24, 1, 12);
    logGeo.rotateZ(Math.PI / 2);
    const logs = inst(logGeo, toon("#a8673a"), 5, true);
    const puddleGeo = new THREE.CircleGeometry(0.6, 20);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddles = inst(puddleGeo, toon("#5cc6f2", { emissive: new THREE.Color("#1d6f9a"), emissiveIntensity: 0.35 }), 4);
    const coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.07, 18);
    coinGeo.rotateX(Math.PI / 2);
    const coins = inst(coinGeo, toon("#ffd23f", { emissive: new THREE.Color("#8a5c00"), emissiveIntensity: 0.45 }), 15, true);
    const appleGeo = new THREE.SphereGeometry(0.21, 14, 10);
    const apples = inst(appleGeo, toon("#ff4d5e"), 3, true);
    const berryGeo = new THREE.ConeGeometry(0.19, 0.34, 10);
    berryGeo.rotateX(Math.PI);
    const berries = inst(berryGeo, toon("#ff3b6b"), 3, true);
    const bananaGeo = new THREE.TorusGeometry(0.2, 0.07, 8, 14, Math.PI);
    const bananas = inst(bananaGeo, toon("#ffd84a"), 3, true);
    const fruitMeshes = [apples, berries, bananas];

    // pool logique : une entrée par instance (préallouée)
    // kind : stone | log | puddle | coin | fruit
    const pool = [];
    const addPool = (kind, mesh, n, extra) => {
      for (let i = 0; i < n; i++) pool.push({ kind, mesh, idx: i, active: false, x: 0, y: 0, z: 0, hw: 0.4, hd: 0.4, top: 0, span: 1, done: false, phase: Math.random() * 6, fruit: 0, ...extra });
    };
    addPool("stone", stones, 6, { hw: 0.42, hd: 0.36, top: 0.48 });
    addPool("log", logs, 5, { hw: 0.55, hd: 0.26, top: 0.46 });
    addPool("puddle", puddles, 4, { hw: 0.5, hd: 0.9, top: 0.06 });
    addPool("coin", coins, 15, { hw: 0.45, hd: 0.4 });
    fruitMeshes.forEach((m, f) => addPool("fruit", m, 3, { hw: 0.5, hd: 0.45, fruit: f }));
    function take(kind, fruit = -1) {
      for (let i = 0; i < pool.length; i++) {
        const e = pool[i];
        if (!e.active && e.kind === kind && (fruit < 0 || e.fruit === fruit)) return e;
      }
      return null;
    }

    // ------------------------------------------------------------------
    // Calque d'effets, caméra, marionnette
    // ------------------------------------------------------------------
    const fx = makeFx(ctx.container || creature.three.renderer.domElement.parentElement);
    creature.setCamera({ position: [0, 5.2, Z0 - 5.5], target: [0, 0, Z0 + 5.5], fov: 52 });
    creature.setInputEnabled?.(false);
    const FACE_RUN = { eyes: "shiny", brows: "raised", mouth: "open" };
    const FACE_OOPS = { eyes: "x", brows: "sad", mouth: "wavy", extras: ["sweat"] };
    const FACE_JOY = { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"] };
    const FACE_TIRED = { eyes: "tired", brows: "sad", mouth: "o", extras: ["sweat"] };
    let pLane = 0, pMotion = "walk", pArms = "rest", pFace = FACE_RUN, pPosture = "stand";
    const pose = (o) => {
      if (o.lane !== undefined) pLane = o.lane;
      if (o.motion) pMotion = o.motion;
      if (o.arms) pArms = o.arms;
      if (o.face) pFace = o.face;
      if (o.posture) pPosture = o.posture;
      creature.setPuppet({ x: laneX(pLane), z: Z0, yaw: 0, posture: pPosture, arms: pArms, motion: pMotion, face: pFace, lockSpin: true });
    };
    pose({ lane: 0, motion: "walk", face: FACE_RUN });

    // ------------------------------------------------------------------
    // État
    // ------------------------------------------------------------------
    const tmp = new THREE.Vector3();
    let state = "ready"; // ready | run | over | done
    let stateT = 0, gameT = 0, runT = 0;
    let paused = false, ended = false;
    let speed = 0, speedMult = 1, dist = 0, lastScore = -1;
    let hearts = HEARTS, coinCount = 0, coinStreak = 0, jumps = 0, hits = 0;
    let curX = 0, jumpAt = -10, jumpQueued = -10, invulnUntil = 0, faceBackAt = -1;
    let nextRowIn = 14, countdown = 4, recordShown = false, milestone = 100;
    const fruitsGot = new Int32Array(FRUITS.length);

    const screenOf = (x, y, z) => {
      tmp.set(x, y, z).project(camera);
      return [tmp.x * 0.5 + 0.5, -tmp.y * 0.5 + 0.5];
    };
    const popAt = (text, x, y, z, kind) => {
      const [sx, sy] = screenOf(x, y, z);
      fx.pop(text, sx, sy, kind);
    };
    const hud = () => {
      let h = "";
      for (let i = 0; i < HEARTS; i++) h += i < hearts ? "♥" : "♡";
      ctx.setHud?.({ text: `${h}  ·  ${coinCount} pièce${coinCount > 1 ? "s" : ""}`, combo: coinStreak >= 5 ? coinStreak : 0 });
    };
    const jumpY = () => {
      const u = (gameT - jumpAt) / HOP_T;
      if (u < 0.2 || u >= 1) return 0;
      return Math.sin(((u - 0.2) / 0.8) * Math.PI) * JUMP_P * 2.2;
    };

    function activate(e, x, y, z) {
      e.active = true; e.done = false; e.x = x; e.y = y; e.z = z;
    }

    // une rangée : 1 ou 2 couloirs bloqués (jamais 3), pièces / fruit dans un couloir libre
    function spawnRow() {
      const d = Math.min(1, runT / 70);
      const blocked = [false, false, false];
      const two = Math.random() < 0.25 + d * 0.4;
      const first = Math.floor(Math.random() * 3);
      blocked[first] = true;
      if (two) blocked[(first + 1 + Math.floor(Math.random() * 2)) % 3] = true;
      // deux couloirs voisins : parfois un seul grand tronc
      const adj = !two ? -1 : blocked[0] && blocked[1] ? 0 : blocked[1] && blocked[2] ? 1 : -1;
      if (adj >= 0 && Math.random() < 0.4) {
        const e = take("log");
        if (e) {
          activate(e, (laneX(adj - 1) + laneX(adj)) / 2, 0.24, SPAWN_Z);
          e.span = 2; e.hw = LANE * 0.95;
          blocked[adj] = blocked[adj + 1] = "done";
        }
      }
      for (let l = 0; l < 3; l++) {
        if (blocked[l] !== true) continue;
        const r = Math.random();
        const kind = r < 0.42 ? "stone" : r < 0.75 ? "log" : "puddle";
        const e = take(kind) || take("stone") || take("log");
        if (!e) { blocked[l] = false; continue; }
        if (e.kind === "stone") activate(e, laneX(l - 1), 0.2, SPAWN_Z);
        else if (e.kind === "log") { activate(e, laneX(l - 1), 0.24, SPAWN_Z); e.span = 1; e.hw = 0.55; }
        else activate(e, laneX(l - 1), 0.025, SPAWN_Z + 0.4);
      }
      // récompenses
      const free = [];
      for (let l = 0; l < 3; l++) if (!blocked[l]) free.push(l);
      const rr = Math.random();
      if (rr < 0.22 && free.length) {
        const f = Math.floor(Math.random() * FRUITS.length);
        const e = take("fruit", f) || take("fruit");
        if (e) activate(e, laneX(free[Math.floor(Math.random() * free.length)] - 1), 0.6, SPAWN_Z + 2);
      } else if (rr < 0.82) {
        // ligne de pièces dans un couloir libre, ou arc au-dessus d'un obstacle
        const overObstacle = Math.random() < 0.3;
        let lane = free.length ? free[Math.floor(Math.random() * free.length)] : -1;
        if (overObstacle || lane < 0) lane = first;
        const n = overObstacle ? 3 : 4 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          const e = take("coin");
          if (!e) break;
          const k = n > 1 ? i / (n - 1) : 0.5;
          const y = overObstacle ? 1.05 + Math.sin(k * Math.PI) * 0.75 : 0.6;
          activate(e, laneX(lane - 1), y, SPAWN_Z + (overObstacle ? (k - 0.5) * 2.6 : 1.5 + i * 1.5));
        }
      }
      nextRowIn = (12 - d * 4) + Math.random() * 3;
    }

    function jump() {
      if (state !== "run") return;
      if (gameT - jumpAt < HOP_T) {
        // en l'air : on garde le saut en mémoire juste avant l'atterrissage
        if (gameT - jumpAt > HOP_T - 0.2) jumpQueued = gameT;
        return;
      }
      jumpAt = gameT;
      jumps++;
      creature.hop?.(JUMP_P);
      beep("jump");
      haptic(8);
    }
    function changeLane(dir) {
      if (state !== "run") return;
      const l = clamp(pLane + dir, -1, 1);
      if (l === pLane) { haptic(4); return; }
      pose({ lane: l });
      haptic(6);
    }

    function hurt(e) {
      e.done = true;
      if (gameT < invulnUntil) return;
      hearts--;
      hits++;
      coinStreak = 0;
      invulnUntil = gameT + 1.4;
      speedMult = 0.65;
      fx.flash("#ffd6d1");
      beep("hit");
      haptic([40, 30, 60]);
      popAt(e.kind === "puddle" ? "Plouf !" : "Aïe !", curX, 2.2 * sk, Z0, "bad");
      pose({ face: FACE_OOPS });
      faceBackAt = gameT + 0.9;
      hud();
      if (hearts <= 0) gameOver(false);
    }

    function collect(e) {
      e.done = true;
      hide(e.mesh, e.idx);
      e.active = false;
      if (e.kind === "coin") {
        coinCount++; coinStreak++;
        beep("coin");
        if (coinCount % 10 === 0) {
          if (hearts < HEARTS) {
            hearts++;
            popAt("+1 ♥", curX, 2.4 * sk, Z0, "gold");
            beep("record");
          } else popAt(`${coinCount} pièces !`, curX, 2.4 * sk, Z0, "gold");
        }
        hud();
      } else {
        fruitsGot[e.fruit]++;
        popAt(`+1 ${FRUITS[e.fruit].label}`, curX, 2.3 * sk, Z0, "gold");
        beep("fruit");
        haptic(15);
        pose({ face: FACE_JOY });
        faceBackAt = gameT + 0.8;
      }
    }

    function gameOver(timeUp) {
      state = "over"; stateT = 0;
      if (timeUp) {
        fx.pop("Quelle endurance !", 0.5, 0.3, "gold big");
        pose({ motion: "dance", face: FACE_JOY, arms: "up" });
      } else {
        say(stage === "bebe" ? "Ouf..." : "Pfiou, je suis lessivée !");
        pose({ motion: "calm", face: FACE_TIRED, arms: "hang", posture: "sit" });
      }
    }

    function finish() {
      if (ended) return;
      ended = true;
      state = "done";
      const score = Math.floor(dist);
      const ingredients = {};
      FRUITS.forEach((f, i) => { if (fruitsGot[i] > 0) ingredients[f.id] = fruitsGot[i]; });
      ctx.setScore?.(score);
      ctx.end?.({
        score,
        details: { metres: score, pieces: coinCount, fruits: fruitsGot.reduce((a, b) => a + b, 0), sauts: jumps, chocs: hits },
        ingredients,
      });
    }

    // ------------------------------------------------------------------
    // Boucle
    // ------------------------------------------------------------------
    const frame = (rawDt) => {
      if (paused || ended) return;
      const dt = Math.min(0.05, rawDt || 0);
      gameT += dt; stateT += dt;
      curX = approach(curX, laneX(pLane), Math.min(1, dt * 8));
      if (faceBackAt > 0 && gameT > faceBackAt) { faceBackAt = -1; pose({ face: FACE_RUN }); }

      if (state === "ready") {
        // compte à rebours pendant que la caméra se place
        const c = 3 - Math.floor(stateT / 0.6);
        if (c !== countdown && c >= 0) {
          countdown = c;
          if (c > 0) { fx.pop(`${c}`, 0.5, 0.35, "big"); beep("tick"); }
          else {
            fx.pop("Partez !", 0.5, 0.35, "gold big");
            beep("go");
            haptic(20);
            state = "run"; stateT = 0;
            speed = v0;
            pose({ motion: "run" });
          }
        }
      } else if (state === "run") {
        runT += dt;
        speedMult = approach(speedMult, 1, Math.min(1, dt * 0.8));
        speed = Math.min(VMAX, v0 + accel * runT) * speedMult;
        dist += speed * dt;
        if (jumpQueued > 0 && gameT - jumpAt >= HOP_T) { jumpQueued = -10; jump(); }
        nextRowIn -= speed * dt;
        if (nextRowIn <= 0) spawnRow();
        const sc = Math.floor(dist);
        if (sc !== lastScore) {
          lastScore = sc;
          ctx.setScore?.(sc);
          if (!recordShown && best >= 50 && sc > best) {
            recordShown = true;
            fx.flash("#fff6d6");
            fx.pop("Record !", 0.5, 0.3, "gold big");
            beep("record");
            haptic([30, 40, 30, 40, 60]);
            say(stage === "bebe" ? "Vroum !" : "Nouveau record !");
          } else if (sc >= milestone) {
            fx.pop(`${milestone} m !`, 0.5, 0.28, "gold");
            milestone += 100;
          }
        }
        if (runT > MAX_T) gameOver(true);
      } else if (state === "over") {
        speed = approach(speed, 0, Math.min(1, dt * 3));
        dist += speed * dt;
        if (stateT > 1.6) finish();
      }

      const move = speed * dt;
      // chemin
      for (let i = 0; i < TILES; i++) {
        tileZ[i] -= move;
        if (tileZ[i] < TILE_START - TILE_L / 2) tileZ[i] += TILES * TILE_L;
        place(tiles, i, 0, 0.012, tileZ[i]);
      }
      for (let i = 0; i < POSTS; i++) {
        postZ[i] -= move;
        if (postZ[i] < TILE_START - 1) postZ[i] += (POSTS / 2) * 3;
        place(posts, i, postX[i], 0, postZ[i]);
      }
      for (let i = 0; i < TREES; i++) {
        treeZ[i] -= move;
        if (treeZ[i] < TILE_START - 2) treeZ[i] += TILES * TILE_L;
        const s = treeS[i];
        place(trunks, i, treeX[i], 0, treeZ[i], 0, s, s, s);
        place(crowns, i, treeX[i], 0, treeZ[i], i, s, s * 0.9, s);
      }

      // objets
      const jy = jumpY();
      const bodyH = 1.5 * sk;
      for (let i = 0; i < pool.length; i++) {
        const e = pool[i];
        if (!e.active) continue;
        e.z -= move;
        if (e.z < DESPAWN_Z) { e.active = false; hide(e.mesh, e.idx); continue; }
        // collisions (une seule fois par objet)
        if (!e.done && state === "run" && Math.abs(e.x - curX) < e.hw + 0.25 && Math.abs(e.z - Z0) < (e.hd + 0.3) * (e.kind === "coin" || e.kind === "fruit" ? 1 : forgive)) {
          if (e.kind === "coin" || e.kind === "fruit") {
            if (e.y > jy - 0.25 && e.y < jy + bodyH + 0.25) { collect(e); continue; }
          } else if (jy < e.top - 0.04) hurt(e);
          else e.done = true; // sauté !
        }
        switch (e.kind) {
          case "stone": place(e.mesh, e.idx, e.x, e.y, e.z, e.phase, 1, 0.75, 1); break;
          case "log": place(e.mesh, e.idx, e.x, e.y, e.z, 0, e.span === 2 ? LANE * 2 * 0.95 : 1.1, 1, 1, e.phase * 0.1); break;
          case "puddle": place(e.mesh, e.idx, e.x, e.y, e.z, 0, 1, 1, 1.6); break;
          case "coin": place(e.mesh, e.idx, e.x, e.y + Math.sin(gameT * 4 + e.phase) * 0.06, e.z, gameT * 4 + e.phase); break;
          default: place(e.mesh, e.idx, e.x, e.y + Math.sin(gameT * 3 + e.phase) * 0.1, e.z, gameT * 2 + e.phase, 1.15, 1.15, 1.15);
        }
      }
      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        if (m.userData.dirty) { m.instanceMatrix.needsUpdate = true; m.userData.dirty = false; }
      }
    };
    const unFrame = creature.onFrame(frame);

    // ------------------------------------------------------------------
    // Entrées
    // ------------------------------------------------------------------
    function tap(ndcX, ndcY, ev = {}) {
      if (paused || ended || state !== "run") return;
      if (ev.type === "swipe") {
        const dx = ev.dx || 0, dy = ev.dy || 0;
        if (Math.abs(dx) > Math.abs(dy) * 0.8) changeLane(dx > 0 ? 1 : -1);
        else if (dy < 0) jump();
        return;
      }
      // appui simple : on saute au relâcher (l'appui peut être le début d'un glissé)
      if (ev.type === "tapend" || (!ev.type)) jump();
    }

    fx.banner("<b>Touche</b> pour sauter, <b>glisse</b> pour changer de couloir");
    if (loves) say(stage === "bebe" ? "Couriiir !" : "J'adore courir !");
    ctx.setScore?.(0);
    hud();

    return {
      tap,
      pause() { paused = true; },
      resume() { paused = false; },
      stop() {
        ended = true;
        unFrame?.();
        root.removeFromParent();
        for (const m of meshes) m.dispose?.();
        for (const d of disposables) d.dispose?.();
        fx.dispose();
      },
    };
  },
};
