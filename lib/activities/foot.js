// lib/activities/foot.js
// Mini-jeu « Foot » : jongles puis tirs au but.
//
// 1. Jongles : le ballon retombe sur sa tête ; toucher l'écran quand le cercle lumineux
//    est vert le relance (doré = parfait). La fenêtre s'élargit avec le trait « joueuse »
//    et rétrécit avec la fatigue et la mauvaise humeur (store.playFeel) ; un bébé est
//    maladroit (relances de travers). Le rythme accélère à chaque jongle. Ralenti + flash
//    au moment où elle bat son record.
// 2. Dès 10 jongles, quand le ballon tombe : 3 tirs au but. Glisser vers le but (direction
//    + force) ; un simple toucher tire vers l'endroit touché, force moyenne. Le gardien bouge.
// Score = jongles + 3 par but.
//
// Contrat : export default { id, start(ctx) } -> { tap, pause, resume, stop } (cf. index.js).
// Aucune allocation par image : vecteurs et objets préparés au démarrage, matériaux modifiés
// sur place. ~12 draw calls.

const STAGE_K = { bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };
const OUTLINE = "#5a2e14";
const BALL_R = 0.2;
const GOAL_Z = 7;
const GOAL_HW = 1.6; // demi-largeur intérieure du but
const GOAL_H = 1.35; // hauteur sous la barre
const SPOT_Z = 1.0; // point de penalty (devant elle)
const SHOTS = 3;
const LATE = 0.09; // tolérance après le contact (s)
const AUTO_PENALTY = 50; // au-delà, on passe aux tirs quoi qu'il arrive

const C = {
  white: "#ffffff", green: "#7fdc5a", gold: "#ffd23f", glowG: "#9cf07a", glowY: "#ffe680",
  emG: "#1f5a10", emY: "#6b5200", black: "#000000",
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const approach = (cur, target, k) => cur + (target - cur) * k;

// ---------------------------------------------------------------------
// Petits outils partagés (dupliqués dans course.js : un fichier par activité)
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

// Calque DOM au-dessus de la 3D : textes qui sautent, bandeau d'aide, flash.
// Éléments créés une fois et réutilisés (aucune création pendant la partie).
const FX_CSS = `
.actfx{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:4;
  font-family:"Fredoka","Nunito",system-ui,sans-serif;-webkit-user-select:none;user-select:none}
.actfx-pop{position:absolute;left:50%;top:50%;opacity:0;white-space:nowrap;font-weight:700;font-size:24px;
  color:#fff;text-shadow:0 2px 0 #3c9a22,0 0 2px #3c9a22,0 4px 10px rgba(43,52,64,.25);transform:translate(-50%,-50%)}
.actfx-pop.gold{color:#fff4b8;text-shadow:0 2px 0 #c98a00,0 0 2px #c98a00,0 0 14px rgba(255,210,63,.8)}
.actfx-pop.bad{text-shadow:0 2px 0 #c42a24,0 0 2px #c42a24,0 4px 10px rgba(43,52,64,.25)}
.actfx-pop.big{font-size:44px}
.actfx-pop.go{animation:actfx-pop .95s ease-out forwards}
.actfx-pop.big.go{animation-duration:1.4s}
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
    // x, y en fraction de l'écran (0..1)
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

// texture de ballon : panneaux sombres sur fond blanc (projection équirectangulaire)
function ballTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#2b3440";
  const pent = (cx, cy, r, sx = 1) => {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = cx + Math.cos(a) * r * sx, y = cy + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fill();
  };
  for (let i = 0; i < 5; i++) {
    pent(i * 51.2 + 25.6, 64, 13);
    pent(i * 51.2, 26, 11, 1.5);
    pent(i * 51.2, 102, 11, 1.5);
  }
  g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function netTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export default {
  id: "foot",
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
    const best = ctx.inventory?.stats?.best?.foot || 0;
    const loves = ctx.tastes?.activity === "foot";
    const say = (s) => (ctx.say ? ctx.say(s) : creature.say?.(s));
    const beep = (k) => ctx.beep?.(k);
    const haptic = (p) => ctx.haptic?.(p);

    // ------------------------------------------------------------------
    // Scène
    // ------------------------------------------------------------------
    const disposables = [];
    const keep = (x) => { disposables.push(x); return x; };
    const root = new THREE.Group();
    root.name = "activity-foot";
    scene.add(root);
    const grad = keep(toonGradient(THREE));
    const toon = (color, extra) => keep(new THREE.MeshToonMaterial({ color, gradientMap: grad, ...extra }));
    const outline = keep(outlineMaterial(THREE, 0.022));
    const outlineThick = keep(outlineMaterial(THREE, 0.035));

    // ballon
    const ballTex = keep(ballTexture(THREE));
    const ballGeo = keep(new THREE.SphereGeometry(BALL_R, 24, 16));
    const ballMat = toon("#ffffff", { map: ballTex, emissive: new THREE.Color("#000000") });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.add(new THREE.Mesh(ballGeo, outline));
    root.add(ball);

    // ombre du ballon
    const shadowGeo = keep(new THREE.CircleGeometry(BALL_R * 1.1, 20));
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = keep(new THREE.MeshBasicMaterial({ color: "#2b3440", transparent: true, opacity: 0.22, depthWrite: false }));
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.renderOrder = 1;
    root.add(shadow);

    // cercles de timing : la cible (au point de contact) et le cercle qui se resserre
    const ringGeo = keep(new THREE.RingGeometry(0.3, 0.37, 40));
    const ringMat = keep(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.6, depthTest: false, depthWrite: false }));
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.renderOrder = 10;
    root.add(ring);
    const glowGeo = keep(new THREE.CircleGeometry(0.3, 40));
    const glowMat = keep(new THREE.MeshBasicMaterial({ color: "#7fdc5a", transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.renderOrder = 9;
    root.add(glow);
    const approachGeo = keep(new THREE.RingGeometry(0.33, 0.36, 40));
    const approachMat = keep(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    const approachRing = new THREE.Mesh(approachGeo, approachMat);
    approachRing.renderOrder = 11;
    root.add(approachRing);

    // but (cadre fusionné en une géométrie), filet, gardien
    const goal = new THREE.Group();
    goal.position.set(0, 0, GOAL_Z);
    goal.visible = false;
    root.add(goal);
    {
      const pr = 0.07;
      const parts = [];
      const post = (x) => {
        const gp = new THREE.CylinderGeometry(pr, pr, GOAL_H + pr, 10);
        gp.translate(x, (GOAL_H + pr) / 2, 0);
        parts.push(gp);
      };
      post(-GOAL_HW - pr); post(GOAL_HW + pr);
      const bar = new THREE.CylinderGeometry(pr, pr, GOAL_HW * 2 + pr * 4, 10);
      bar.rotateZ(Math.PI / 2); bar.translate(0, GOAL_H + pr, 0);
      parts.push(bar);
      const frameGeo = keep(mergeSimple(THREE, parts));
      parts.forEach((p) => p.dispose());
      const frame = new THREE.Mesh(frameGeo, toon("#ffffff"));
      frame.add(new THREE.Mesh(frameGeo, outlineThick));
      goal.add(frame);
      // filet : fond + côtés + toit, une seule géométrie
      const netTex = keep(netTexture(THREE));
      netTex.repeat.set(5, 2);
      const netMat = keep(new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 }));
      const depth = 0.9;
      const nb = [];
      const back = new THREE.PlaneGeometry(GOAL_HW * 2, GOAL_H); back.translate(0, GOAL_H / 2, depth); nb.push(back);
      for (const s of [-1, 1]) {
        const side = new THREE.PlaneGeometry(depth, GOAL_H); side.rotateY(Math.PI / 2); side.translate(s * GOAL_HW, GOAL_H / 2, depth / 2); nb.push(side);
      }
      const top = new THREE.PlaneGeometry(GOAL_HW * 2, depth); top.rotateX(Math.PI / 2); top.translate(0, GOAL_H, depth / 2); nb.push(top);
      const netGeo = keep(mergeSimple(THREE, nb));
      nb.forEach((p) => p.dispose());
      goal.add(new THREE.Mesh(netGeo, netMat));
      // ligne de but peinte au sol
      const lineGeo = keep(new THREE.PlaneGeometry(GOAL_HW * 2 + 1.2, 0.08));
      lineGeo.rotateX(-Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeo, keep(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8 })));
      lineMesh.position.set(0, 0.02, 0);
      goal.add(lineMesh);
    }
    // gardien : petit bonhomme violet, gants blancs
    const keeper = new THREE.Group();
    const keeperBody = new THREE.Group();
    keeper.add(keeperBody);
    {
      const bodyGeo = keep(new THREE.SphereGeometry(1, 20, 14));
      const b = new THREE.Mesh(bodyGeo, toon("#8048e0"));
      b.scale.set(0.42, 0.55, 0.36);
      b.position.y = 0.56;
      b.add(new THREE.Mesh(bodyGeo, keep(outlineMaterial(THREE, 0.06))));
      keeperBody.add(b);
      const eyeParts = [];
      for (const s of [-1, 1]) {
        const w = new THREE.SphereGeometry(0.085, 10, 8); w.translate(s * 0.13, 0.76, -0.3); eyeParts.push(w);
      }
      const eyesGeo = keep(mergeSimple(THREE, eyeParts));
      eyeParts.forEach((p) => p.dispose());
      keeperBody.add(new THREE.Mesh(eyesGeo, toon("#ffffff")));
      const pupilParts = [];
      for (const s of [-1, 1]) {
        const p = new THREE.SphereGeometry(0.045, 8, 6); p.translate(s * 0.13, 0.76, -0.37); pupilParts.push(p);
      }
      const pupilGeo = keep(mergeSimple(THREE, pupilParts));
      pupilParts.forEach((p) => p.dispose());
      keeperBody.add(new THREE.Mesh(pupilGeo, toon("#2b3440")));
      const gloveParts = [];
      for (const s of [-1, 1]) {
        const gl = new THREE.SphereGeometry(0.13, 12, 8); gl.translate(s * 0.52, 0.78, -0.08); gloveParts.push(gl);
      }
      const gloveGeo = keep(mergeSimple(THREE, gloveParts));
      gloveParts.forEach((p) => p.dispose());
      const gloves = new THREE.Mesh(gloveGeo, toon("#ffffff"));
      gloves.add(new THREE.Mesh(gloveGeo, outline));
      keeperBody.add(gloves);
    }
    keeper.position.set(0, 0, -0.25);
    goal.add(keeper);

    // ------------------------------------------------------------------
    // Calque d'effets, caméra, marionnette
    // ------------------------------------------------------------------
    const fx = makeFx(ctx.container || creature.three.renderer.domElement.parentElement);
    const headTop = 2.25 * sk; // estimation avant la première mesure
    const camJuggle = { position: [0, 1.15 + headTop * 0.62, 10.2], target: [0, 0.55 + headTop * 0.62, 0], fov: 36 };
    creature.setCamera(camJuggle);
    creature.setInputEnabled?.(false);

    const FACE_PLAY = { eyes: "shiny", brows: "raised", mouth: "open", gaze: [0, -1] };
    const FACE_FOCUS = { eyes: "dot", brows: "neutral", mouth: "content", gaze: [0, -1] };
    const FACE_OOPS = { eyes: "x", brows: "sad", mouth: "wavy" };
    const FACE_JOY = { eyes: "star", brows: "raised", mouth: "laugh", extras: ["blush"] };
    const FACE_SAD = { eyes: "tired", brows: "sad", mouth: "pout" };
    let puppetX = 0, puppetZ = 0, puppetYaw = 0, puppetArms = "rest", puppetMotion = "calm", puppetFace = FACE_FOCUS;
    const pose = (o) => {
      if (o.x !== undefined) puppetX = o.x;
      if (o.z !== undefined) puppetZ = o.z;
      if (o.yaw !== undefined) puppetYaw = o.yaw;
      if (o.arms) puppetArms = o.arms;
      if (o.motion) puppetMotion = o.motion;
      if (o.face) puppetFace = o.face;
      creature.setPuppet({ x: puppetX, z: puppetZ, yaw: puppetYaw, posture: "stand", arms: puppetArms, motion: puppetMotion, face: puppetFace, lockSpin: true });
    };
    pose({ x: 0, z: 0, yaw: 0, arms: "rest", motion: "calm", face: FACE_FOCUS });

    // ------------------------------------------------------------------
    // État
    // ------------------------------------------------------------------
    const tmp = new THREE.Vector3();
    const col = {};
    for (const k in C) col[k] = new THREE.Color(C[k]);
    const headAnchor = creature.anchor?.("tete") || null;
    let href = headTop; // hauteur du sommet du crâne (lissée)
    let state = "intro"; // intro | juggle | drop | toPenalty | aim | shot | shotEnd | done
    let stateT = 0;
    let paused = false, ended = false;
    let timeScale = 1, slowLeft = 0;
    let juggles = 0, combo = 0, bestCombo = 0, perfects = 0, goals = 0, shot = 0;
    let retried = false, recordShown = false, lockUntil = 0, armsBackAt = -1, faceBackAt = -1;
    let gameT = 0;
    // ballon
    let bx = 0, by = headTop + 3, bz = 0.25, vx = 0, vy = 0, vz = 0, spinX = 0, spinZ = 0;
    let targetX = 0;
    let g = 9;
    let win = 0.26 * hitWindow;
    // tirs
    let keeperX = 0, keeperGoal = 0, keeperDiveAt = 0, keeperSpeed = 2.2, keeperTilt = 0;
    let shotResolved = false, bouncedNet = false;

    const score = () => juggles + 3 * goals;
    const hud = () => {
      if (state === "aim" || state === "shot" || state === "shotEnd" || state === "toPenalty") {
        ctx.setHud?.({ text: `Tir ${Math.min(shot + 1, SHOTS)}/${SHOTS} · ${goals} but${goals > 1 ? "s" : ""}`, combo: 0 });
      } else {
        ctx.setHud?.({ text: juggles >= 10 ? "Jongles · tirs au but débloqués !" : "Jongles", combo });
      }
    };
    const pushScore = () => { ctx.setScore?.(score()); hud(); };

    // projection d'un point 3D en fraction d'écran (pour les textes)
    const screenOf = (x, y, z) => {
      tmp.set(x, y, z).project(camera);
      return [tmp.x * 0.5 + 0.5, -tmp.y * 0.5 + 0.5];
    };
    const popAt = (text, x, y, z, kind) => {
      const [sx, sy] = screenOf(x, y, z);
      fx.pop(text, sx, sy, kind);
    };

    const contactY = () => href + BALL_R * 0.9;
    // temps avant que le ballon atteigne le point de contact (négatif s'il l'a dépassé)
    const timeToContact = () => {
      const d = by - contactY();
      const v = -vy; // vitesse de chute (positive vers le bas)
      if (d <= 0) return v > 0.01 ? d / v : 0;
      return (-v + Math.sqrt(Math.max(0, v * v + 2 * g * d))) / g;
    };
    const difficulty = () => Math.min(1, juggles / 40);

    // relance : le ballon repart vers le haut et retombera sur sa tête en targetX
    function launch(quality) {
      const d = difficulty();
      g = 9 * (1 + d * 0.8);
      let apex = (2.15 - d * 0.85) * (0.75 + 0.25 * sk);
      const spread = (0.12 + d * 0.55) * (quality >= 1 ? 0.45 : 1);
      targetX = (Math.random() * 2 - 1) * spread;
      // maladresse (bébé surtout) : relance de travers, plus basse
      if (Math.random() < clumsy * (quality >= 1 ? 0.35 : 1)) {
        targetX += (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.25);
        apex *= 0.8;
        fx.pop("Oups !", 0.5, 0.3, "bad");
      }
      targetX = clamp(targetX, -1, 1);
      vy = Math.sqrt(2 * g * apex);
      const airT = (2 * vy) / g;
      vx = (targetX - bx) / airT;
      spinX = -6 - Math.random() * 6; spinZ = (targetX - bx) * 4;
      win = 0.26 * hitWindow * (1 - d * 0.3);
      pose({ x: targetX });
    }

    function startJuggle() {
      state = "juggle"; stateT = 0;
      bx = 0; targetX = 0; by = href + 3.2; vy = 0; vx = 0; bz = 0.25;
      g = 6; // première chute plus douce
      win = 0.3 * hitWindow;
      pose({ x: 0, face: FACE_PLAY, arms: "rest" });
    }

    function hit(tc) {
      const perfect = tc <= win * 0.42 && tc >= -0.035;
      juggles++;
      combo = perfect ? combo + 1 : Math.max(1, Math.floor(combo / 2));
      bestCombo = Math.max(bestCombo, combo);
      if (perfect) perfects++;
      by = Math.max(by, contactY());
      launch(perfect ? 1 : 0.5);
      creature.hop?.(0.12);
      pose({ arms: "up" });
      armsBackAt = gameT + 0.3;
      beep(perfect ? "perfect" : "ball");
      haptic(perfect ? [12, 30, 12] : 12);
      if (perfect) popAt(combo >= 3 ? `Parfait ×${combo} !` : "Parfait !", bx, by + 0.5, bz, "gold");
      else popAt(`${juggles}`, bx, by + 0.5, bz, "");
      // record battu : ralenti + flash
      if (!recordShown && best >= 5 && juggles === best + 1) {
        recordShown = true;
        slowLeft = 0.9;
        fx.flash("#fff6d6");
        fx.pop("Record !", 0.5, 0.32, "gold big");
        beep("record");
        haptic([30, 40, 30, 40, 60]);
        say(stage === "bebe" ? "Encoooore !" : "Nouveau record !");
        pose({ face: FACE_JOY });
        faceBackAt = gameT + 1.4;
      } else if (juggles === 10) {
        fx.banner("<b>10 jongles !</b> Tirs au but débloqués");
        beep("record");
      } else if (juggles % 10 === 0) {
        fx.pop(`${juggles} !`, 0.5, 0.3, "gold big");
      }
      pushScore();
      if (juggles >= AUTO_PENALTY) {
        fx.banner("<b>Incroyable !</b> Place aux tirs au but");
        dropBall(false);
      }
    }

    function dropBall(missed) {
      state = "drop"; stateT = 0;
      if (missed) {
        vx = (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random());
        vy = 2.2;
        combo = 0;
        beep("miss");
        haptic([40, 30, 40]);
        popAt("Raté !", bx, by + 0.4, bz, "bad");
        pose({ face: FACE_OOPS, arms: "hang" });
      }
      pushScore();
    }

    function startPenalties() {
      state = "toPenalty"; stateT = 0;
      goal.visible = true;
      ring.visible = glow.visible = approachRing.visible = false;
      creature.setCamera({ position: [0.6, 2.7, -3.4], target: [0, 0.75, GOAL_Z], fov: 46 });
      pose({ x: -0.8, z: 0.2, yaw: 0, arms: "rest", motion: "calm", face: FACE_FOCUS });
      resetShotBall();
      say(stage === "bebe" ? "Tir !" : "Aux tirs au but !");
      fx.banner("<b>Glisse vers le but</b> : direction et force !");
      hud();
    }

    function resetShotBall() {
      bx = 0; by = BALL_R; bz = SPOT_Z; vx = vy = vz = 0; spinX = spinZ = 0;
      shotResolved = false; bouncedNet = false;
      keeperGoal = 0; keeperTilt = 0;
      keeperBody.rotation.set(0, 0, 0); keeperBody.position.set(0, 0, 0);
    }

    // tir : angle (rad, + vers la droite de l'écran), puissance 0..1.2
    function shoot(angle, power) {
      if (state !== "aim") return;
      state = "shot"; stateT = 0;
      const p = clamp(power, 0.12, 1.25);
      vz = 6 + p * 7;
      const dist = GOAL_Z - bz;
      const T = dist / vz;
      // vu de derrière (caméra en -z, regard vers +z), la droite de l'écran correspond à -x
      vx = -Math.tan(clamp(angle, -0.75, 0.75)) * vz;
      const hAtGoal = 0.12 + 1.75 * p * p;
      vy = (hAtGoal - by + 0.5 * 9.8 * T * T) / T;
      spinX = 10 + p * 10; spinZ = -vx * 2;
      // le gardien lit le tir avec un temps de retard
      const predicted = bx + vx * T;
      keeperDiveAt = gameT + Math.max(0.12, 0.28 - shot * 0.04);
      keeperSpeed = 1.5 + shot * 0.35 + (1 - hitWindow) * 0.6;
      keeperGoal = clamp(predicted, -1.35, 1.35);
      pose({ x: -0.35, arms: "up" });
      armsBackAt = gameT + 0.35;
      creature.hop?.(0.1);
      beep("kick");
      haptic(18);
    }

    function shotOutcome(kind) {
      shotResolved = true;
      state = "shotEnd"; stateT = 0;
      if (kind === "goal") {
        goals++;
        fx.pop("BUT !", 0.5, 0.35, "gold big");
        fx.flash("#eaffdc");
        beep("goal");
        haptic([30, 40, 80]);
        pose({ face: FACE_JOY, arms: "up", motion: "dance" });
        say(loves ? "Je suis la meilleure !" : stage === "bebe" ? "Buuut !" : "Buuut !");
      } else if (kind === "save") {
        fx.pop("Arrêt !", 0.5, 0.35, "bad");
        beep("miss");
        haptic(30);
        pose({ face: FACE_SAD, arms: "hang" });
      } else {
        fx.pop(kind === "high" ? "Trop haut !" : kind === "short" ? "Trop court !" : "À côté !", 0.5, 0.35, "bad");
        beep("miss");
        pose({ face: FACE_SAD, arms: "hang" });
      }
      shot++;
      pushScore();
    }

    function finish() {
      if (ended) return;
      ended = true;
      state = "done";
      ring.visible = glow.visible = approachRing.visible = false;
      ctx.setScore?.(score());
      ctx.end?.({
        score: score(),
        details: { jongles: juggles, buts: goals, tirs: shot, parfaits: perfects, meilleurCombo: bestCombo },
      });
    }

    // ------------------------------------------------------------------
    // Boucle
    // ------------------------------------------------------------------
    const frame = (rawDt) => {
      if (paused || ended) return;
      const realDt = Math.min(0.05, rawDt || 0);
      if (slowLeft > 0) {
        slowLeft -= realDt;
        timeScale = approach(timeScale, slowLeft > 0.15 ? 0.28 : 1, Math.min(1, realDt * 12));
      } else timeScale = approach(timeScale, 1, Math.min(1, realDt * 8));
      const dt = realDt * timeScale;
      gameT += dt;
      stateT += dt;

      if (headAnchor) {
        headAnchor.getWorldPosition(tmp);
        if (tmp.y > 0.3) href = approach(href, tmp.y, Math.min(1, realDt * 4));
      }
      if (armsBackAt > 0 && gameT > armsBackAt) { armsBackAt = -1; pose({ arms: "rest" }); }
      if (faceBackAt > 0 && gameT > faceBackAt) { faceBackAt = -1; pose({ face: FACE_PLAY }); }

      const cy = contactY();
      if (state === "intro") {
        // le ballon flotte au-dessus d'elle, puis tombe
        bx = 0; by = href + 3.2 + Math.sin(gameT * 3) * 0.08;
        if (stateT > 1.1) startJuggle();
      } else if (state === "juggle") {
        vy -= g * dt;
        bx += vx * dt; by += vy * dt;
        if (vy < 0 && by < cy && timeToContact() < -LATE) dropBall(true);
      } else if (state === "drop" || state === "shotEnd" || state === "shot") {
        vy -= 9.8 * dt;
        bx += vx * dt; by += vy * dt; bz += vz * dt;
        if (by < BALL_R) {
          by = BALL_R;
          if (vy < -0.6) { vy = -vy * 0.55; vx *= 0.8; vz *= 0.8; } else {
            const f = Math.max(0, 1 - 2.2 * dt); // roule et ralentit
            vy = 0; vx *= f; vz *= f;
          }
        }
        if (state === "shot") {
          if (!shotResolved && bz >= GOAL_Z - 0.15) {
            const inX = Math.abs(bx) < GOAL_HW - BALL_R * 0.5;
            const inY = by < GOAL_H - BALL_R * 0.3;
            const kx = keeperX + keeperBody.position.x;
            const saved = inX && inY && Math.abs(bx - kx) < 0.5 + BALL_R && by < 1.15 + Math.abs(keeperTilt) * 0.2;
            if (saved) { vz = -2.5 - Math.random(); vy = Math.abs(vy) * 0.4 + 1; vx = (bx - kx) * 3; shotOutcome("save"); }
            else if (inX && inY) shotOutcome("goal");
            else shotOutcome(!inY ? "high" : "wide");
          } else if (!shotResolved && vz < 0.6 && stateT > 0.4) {
            shotOutcome("short");
          }
        }
        // filet : le ballon s'y arrête
        if (state === "shotEnd" && !bouncedNet && bz > GOAL_Z + 0.75 && Math.abs(bx) < GOAL_HW && by < GOAL_H) {
          bouncedNet = true; vz = -vz * 0.15; vx *= 0.3;
          fx.flash("#ffffff");
        }
        if (state === "drop" && stateT > 1.2) {
          if (juggles >= 10) startPenalties();
          else if (juggles < 3 && !retried) {
            retried = true;
            fx.banner("<b>Encore un essai !</b> Touche quand le cercle est vert");
            say(stage === "bebe" ? "Encore !" : "Allez, encore !");
            state = "intro"; stateT = 0.2;
            pose({ face: FACE_PLAY, arms: "rest" });
          } else {
            pose({ face: juggles >= 5 ? FACE_JOY : FACE_SAD, arms: juggles >= 5 ? "up" : "rest" });
            finish();
          }
        }
        if (state === "shotEnd" && stateT > 1.5) {
          if (shot >= SHOTS) {
            pose({ face: goals >= 2 ? FACE_JOY : goals ? FACE_PLAY : FACE_SAD, motion: goals >= 2 ? "dance" : "calm" });
            finish();
          } else {
            state = "aim"; stateT = 0;
            resetShotBall();
            pose({ x: -0.8, face: FACE_FOCUS, arms: "rest", motion: "calm" });
            hud();
          }
        }
      } else if (state === "toPenalty") {
        bx = 0; by = BALL_R; bz = SPOT_Z;
        if (stateT > 1.2) { state = "aim"; stateT = 0; }
      }

      // gardien
      if (goal.visible) {
        const sway = 0.55 + shot * 0.25;
        const swayX = Math.sin(gameT * (1.6 + shot * 0.5)) * sway;
        if (state === "shot" && gameT > keeperDiveAt) {
          const dx = keeperGoal - (keeperX + keeperBody.position.x);
          const step = clamp(dx, -keeperSpeed * dt, keeperSpeed * dt);
          keeperBody.position.x += step;
          // rotation.z positive penche le haut vers -x : on penche du côté du plongeon
          keeperTilt = approach(keeperTilt, -clamp(dx * 2.5, -0.9, 0.9) - Math.sign(dx) * 0.2, Math.min(1, dt * 10));
          keeperBody.position.y = approach(keeperBody.position.y, Math.abs(keeperTilt) * 0.18, Math.min(1, dt * 10));
        } else if (state === "aim" || state === "toPenalty") {
          keeperX = swayX;
          keeperTilt = approach(keeperTilt, 0, Math.min(1, dt * 6));
        }
        keeper.position.x = keeperX;
        keeperBody.rotation.z = keeperTilt;
      }

      // ballon et ombre
      ball.position.set(bx, by, bz);
      ball.rotation.x += spinX * dt;
      ball.rotation.z += spinZ * dt;
      shadow.position.set(bx, 0.015, bz);
      const hgt = Math.max(0, by - BALL_R);
      shadow.scale.setScalar(Math.max(0.35, 1 - hgt * 0.18));
      shadowMat.opacity = Math.max(0.06, 0.24 - hgt * 0.04);

      // cercles de timing
      const showRings = state === "juggle" || state === "intro";
      ring.visible = glow.visible = approachRing.visible = showRings;
      if (showRings) {
        const tc = state === "juggle" && vy < 0 ? timeToContact() : 9;
        ring.position.set(targetX, cy, bz + 0.25);
        ring.quaternion.copy(camera.quaternion);
        glow.position.copy(ring.position); glow.quaternion.copy(camera.quaternion);
        approachRing.position.copy(ring.position); approachRing.quaternion.copy(camera.quaternion);
        const inWin = tc <= win && tc >= -LATE;
        const perfect = tc <= win * 0.42 && tc >= -0.035;
        if (inWin) {
          ringMat.color.copy(perfect ? col.gold : col.green);
          ringMat.opacity = 1;
          glowMat.color.copy(perfect ? col.glowY : col.glowG);
          glowMat.opacity = perfect ? 0.55 : 0.38;
          ballMat.emissive.copy(perfect ? col.emY : col.emG);
          ring.scale.setScalar(1.12);
        } else {
          ringMat.color.copy(col.white);
          ringMat.opacity = tc < 2 ? 0.75 : 0.45;
          glowMat.opacity = 0;
          ballMat.emissive.copy(col.black);
          ring.scale.setScalar(1);
        }
        glow.scale.setScalar(1);
        const lead = Math.max(0, tc - win * 0.2);
        approachRing.scale.setScalar(1 + Math.min(3.2, (lead / Math.max(0.05, win)) * 2.2));
        approachMat.opacity = tc > 8 ? 0 : clamp(1.4 - lead / Math.max(0.05, win * 1.6), 0, 0.9);
        approachMat.color.copy(inWin ? (perfect ? col.gold : col.green) : col.white);
      } else {
        ballMat.emissive.copy(col.black);
      }
    };
    const unFrame = creature.onFrame(frame);

    // ------------------------------------------------------------------
    // Entrées
    // ------------------------------------------------------------------
    function tap(ndcX, ndcY, ev = {}) {
      if (paused || ended) return;
      const type = ev.type || "tap";
      // jongles : réagit à l'appui (pointerdown) ; tirs : au relâcher (swipe / tapend)
      if (state === "intro" && stateT > 0.5 && type === "tap") { startJuggle(); return; }
      if (state === "juggle") {
        if (type !== "tap") return;
        if (gameT < lockUntil) return;
        const tc = vy < 0 ? timeToContact() : 9;
        if (tc <= win && tc >= -LATE) hit(tc);
        else {
          // trop tôt : petit blocage pour décourager de tapoter au hasard
          lockUntil = gameT + 0.22;
          combo = 0;
          hud();
          popAt("Trop tôt !", targetX, contactY() + 0.6, bz, "bad");
          haptic(6);
        }
        return;
      }
      if (state === "aim") {
        if (type === "tap") return; // on attend le relâcher pour lire le geste
        if (type === "swipe") {
          const dx = ev.dx || 0, dy = ev.dy || 0;
          if (dy > -12) { fx.banner("<b>Glisse vers le haut</b>, en direction du but"); return; }
          const angle = Math.atan2(dx, -dy) * 0.6;
          let sp = ev.speed || 0;
          if (sp > 0 && sp < 20) sp *= 1000; // px/ms -> px/s
          const len = Math.hypot(dx, dy);
          const h = (ctx.container?.clientHeight || window.innerHeight || 700);
          const power = sp > 0 ? clamp(sp / 2400, 0, 1.25) * 0.65 + clamp(len / (h * 0.45), 0, 1.25) * 0.35 : clamp(len / (h * 0.4), 0, 1.25);
          shoot(angle, power);
        } else {
          // toucher : tir vers l'endroit visé, force moyenne
          const aim = clamp(ndcX || 0, -1, 1) * 0.42;
          shoot(aim, 0.6);
        }
      }
    }

    // ------------------------------------------------------------------
    // Départ
    // ------------------------------------------------------------------
    fx.banner("Touche l'écran quand le cercle est <b>vert</b> !");
    if (loves) say(stage === "bebe" ? "Ballon !" : "Youpi, le foot !");
    pushScore();

    return {
      tap,
      pause() { paused = true; },
      resume() { paused = false; },
      stop() {
        ended = true;
        unFrame?.();
        root.removeFromParent();
        root.traverse((o) => { if (o.isMesh && o.geometry && !disposables.includes(o.geometry)) o.geometry.dispose(); });
        for (const d of disposables) d.dispose?.();
        fx.dispose();
      },
    };
  },
};

// fusion minimale de géométries non indexées/indexées ayant position + normal (+ uv)
function mergeSimple(THREE, geos) {
  const parts = geos.map((g0) => (g0.index ? g0.toNonIndexed() : g0));
  let n = 0;
  for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    if (p.attributes.uv) uv.set(p.attributes.uv.array, o * 2);
    o += p.attributes.position.count;
  }
  parts.forEach((p, i) => { if (p !== geos[i]) p.dispose(); });
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
