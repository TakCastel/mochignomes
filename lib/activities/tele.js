// lib/activities/tele.js : la télé sur le canapé. Scène douce, SANS score ni échec.
// Un « épisode du jour » différent chaque jour sur 4 chaînes (dessin animé, nature, cuisine, sport) ;
// toucher la télé zappe ; sa chaîne préférée (tastes.channel) la fait fondre et révèle ce goût.
// ~26 s, finit tout doucement (elle bâille, « FIN » à l'écran). Récompenses : store.applyActivity
// (amusement, +5 énergie, ~0 pièce) avec result.channel = la chaîne regardée le plus longtemps.
//
// Exporte aussi les briques réutilisées par lib/meadowProps.js : makeTv, makeSofa, createScreen.
import { CHANNELS as TASTE_CHANNELS } from "~/lib/tastes";

// Les 3 chaînes des goûts + le sport (jamais préféré, mais ça bouge)
export const TV_CHANNELS = [
  ...TASTE_CHANNELS.map((c) => ({ id: c.id, label: c.label })),
  { id: "sport", label: "Sport" },
];

const DURATION = 26;
const STAGE_SCALE = { bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };
const dayIndex = () => {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};

// ---------------------------------------------------------------------
// Écran : texture canvas animée (aucune allocation par image : dégradés en cache)
// ---------------------------------------------------------------------
const PALETTES = [
  { a: "#7fd6ff", b: "#ffe680", c: "#ff7aa8", d: "#5bd16a" },
  { a: "#ffb4d9", b: "#b4f0ff", c: "#7b6cff", d: "#ffcc4d" },
  { a: "#c6f28c", b: "#fff1c2", c: "#ff8a3d", d: "#3cb7ff" },
];

export function createScreen(THREE, { w = 256, h = 192 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const day = dayIndex();
  const episode = (day % 97) + 1;
  // variante du jour par chaîne + dégradés précalculés
  const variants = TV_CHANNELS.map((_, i) => (day * 7 + i * 3) % PALETTES.length);
  const grads = TV_CHANNELS.map((_, i) => {
    const p = PALETTES[variants[i]];
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, p.a); sky.addColorStop(1, p.b);
    return sky;
  });
  const titles = TV_CHANNELS.map((c, i) => `${i + 1} · ${c.label}`);
  const epText = `Ép. ${episode}`;
  let last = -1;

  function label(i) {
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(6, 6, 118, 22);
    g.fillStyle = "#fff";
    g.font = "bold 14px Nunito, system-ui, sans-serif";
    g.textBaseline = "middle";
    g.fillText(titles[i], 12, 17);
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = "bold 11px Nunito, system-ui, sans-serif";
    g.fillText(epText, w - 46, h - 12);
  }
  function blob(x, y, r, color, t) {
    g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, r * (1 + Math.sin(t * 8) * 0.06), r * (1 - Math.sin(t * 8) * 0.06), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff";
    g.beginPath(); g.arc(x - r * 0.35, y - r * 0.2, r * 0.26, 0, Math.PI * 2); g.arc(x + r * 0.35, y - r * 0.2, r * 0.26, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#222";
    g.beginPath(); g.arc(x - r * 0.3, y - r * 0.18, r * 0.12, 0, Math.PI * 2); g.arc(x + r * 0.4, y - r * 0.18, r * 0.12, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#222"; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y + r * 0.15, r * 0.3, 0.2, Math.PI - 0.2); g.stroke();
  }

  function cartoon(t, p) {
    g.fillStyle = p.d; g.fillRect(0, h * 0.72, w, h * 0.28);
    for (let i = 0; i < 6; i++) { // étoiles qui clignotent
      const s = 3 + 2 * Math.sin(t * 4 + i * 1.7);
      g.fillStyle = "#fff";
      g.fillRect(((i * 47 + 20) % w) - s / 2, 30 + ((i * 29) % 60) - s / 2, s, s);
    }
    const x = w * 0.5 + Math.sin(t * 1.3) * w * 0.3;
    const y = h * 0.72 - 26 - Math.abs(Math.sin(t * 3.2)) * 60;
    blob(x, y, 24, p.c, t);
    const x2 = x - 60 * Math.sign(Math.cos(t * 1.3) || 1);
    blob(x2, h * 0.72 - 14 - Math.abs(Math.sin(t * 3.2 + 1.4)) * 30, 13, "#fff3a0", t + 1);
  }
  function nature(t, p, v) {
    g.fillStyle = "#fff6b0"; // soleil
    g.beginPath(); g.arc(w * 0.78, 46, 20, 0, Math.PI * 2); g.fill();
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer ? p.d : "#9fd88a";
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.62 + layer * 0.12) + Math.sin(x * 0.03 + t * (0.3 + layer * 0.3)) * 10);
      g.lineTo(w, h); g.closePath(); g.fill();
    }
    if (v === 1) { // papillon
      const bx = w * 0.5 + Math.sin(t * 0.9) * 70, by = 80 + Math.sin(t * 2.3) * 20, f = Math.abs(Math.sin(t * 12));
      g.fillStyle = p.c;
      g.beginPath(); g.ellipse(bx - 8 * f, by, 9 * f + 1, 11, 0, 0, Math.PI * 2); g.ellipse(bx + 8 * f, by, 9 * f + 1, 11, 0, 0, Math.PI * 2); g.fill();
    } else { // oiseaux
      g.strokeStyle = "#2b3440"; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const bx = ((t * 40 + i * 70) % (w + 60)) - 30, by = 50 + i * 18, f = Math.sin(t * 9 + i) * 6;
        g.beginPath(); g.moveTo(bx - 10, by - f); g.lineTo(bx, by); g.lineTo(bx + 10, by - f); g.stroke();
      }
    }
  }
  function cuisine(t, p, v) {
    g.fillStyle = "#e9d2b0"; g.fillRect(0, h * 0.66, w, h * 0.34);
    g.fillStyle = "#3a3a44"; // poêle
    g.beginPath(); g.ellipse(w * 0.5, h * 0.66, 70, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(w * 0.5 + 66, h * 0.66 - 4, 54, 8);
    const ph = (t * 0.8) % 1, jump = ph < 0.5 ? Math.sin(ph * 2 * Math.PI) * 50 : 0;
    g.fillStyle = v === 2 ? "#ffd84a" : v === 1 ? "#f2b45a" : "#f7d48b";
    g.beginPath(); g.ellipse(w * 0.5, h * 0.64 - jump, 52, 12 * Math.abs(Math.cos(ph * Math.PI * 2)) + 2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 4;
    for (let i = 0; i < 3; i++) { // vapeur
      const sx = w * 0.4 + i * 26;
      g.beginPath(); g.moveTo(sx, h * 0.5);
      for (let k = 1; k <= 4; k++) g.lineTo(sx + Math.sin(t * 3 + k + i) * 6, h * 0.5 - k * 12);
      g.stroke();
    }
    g.fillStyle = p.c; // toque du chef
    g.beginPath(); g.arc(40, 46, 16, 0, Math.PI * 2); g.fill();
  }
  function sport(t, p) {
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#48b84f" : "#3fa847"; g.fillRect(0, 40 + i * 26, w, 26); }
    g.strokeStyle = "#fff"; g.lineWidth = 3;
    g.strokeRect(10, 44, w - 20, h - 52);
    g.beginPath(); g.moveTo(w / 2, 44); g.lineTo(w / 2, h - 8); g.stroke();
    const bx = w / 2 + Math.sin(t * 1.7) * 90, by = 110 + Math.sin(t * 2.9) * 40;
    g.fillStyle = p.c; g.beginPath(); g.arc(bx - 24, by + 10, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3c6cff"; g.beginPath(); g.arc(bx + 26, by - 8, 12, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(bx, by, 6, 0, Math.PI * 2); g.fill();
  }
  const DRAW = [cartoon, nature, cuisine, sport];

  return {
    texture, canvas, episode,
    // dessine la chaîne i à l'instant t (limité à ~20 images/s)
    draw(i, t) {
      if (t - last < 0.05 && t >= last) return;
      last = t;
      g.fillStyle = grads[i]; g.fillRect(0, 0, w, h);
      DRAW[i](t, PALETTES[variants[i]], variants[i]);
      label(i);
      texture.needsUpdate = true;
    },
    // neige du zapping
    noise(t) {
      if (t - last < 0.04 && t >= last) return;
      last = t;
      g.fillStyle = "#30343c"; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 140; k++) {
        const c = (Math.random() * 200 + 40) | 0;
        g.fillStyle = c > 160 ? "#e8e8e8" : c > 100 ? "#9a9a9a" : "#5a5a5a";
        g.fillRect(Math.random() * w, Math.random() * h, 6 + Math.random() * 10, 3);
      }
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, (t * 300) % h, w, 10);
      texture.needsUpdate = true;
    },
    // carton de fin
    fin(text = "FIN") {
      g.fillStyle = "#1d2230"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "900 46px Nunito, system-ui, sans-serif"; g.fillText(text, w / 2, h / 2 - 8);
      g.font = "bold 13px Nunito, system-ui, sans-serif"; g.fillText(`À demain pour l'épisode ${episode + 1}`, w / 2, h / 2 + 30);
      g.textAlign = "left";
      last = -1;
      texture.needsUpdate = true;
    },
    off() {
      g.fillStyle = "#26303c"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(20, 16, w * 0.35, 10);
      last = -1;
      texture.needsUpdate = true;
    },
    dispose() { texture.dispose(); },
  };
}

// ---------------------------------------------------------------------
// Maillages : télé rétro (5 draw calls) et canapé (4 draw calls)
// ---------------------------------------------------------------------
export function makeTv(THREE, screen) {
  const group = new THREE.Group();
  const geos = [], mats = [];
  const add = (geo, mat, x, y, z, parent = group) => {
    geos.push(geo); if (!mats.includes(mat)) mats.push(mat);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
  };
  const shell = new THREE.MeshToonMaterial({ color: "#fff4e2" });
  const dark = new THREE.MeshToonMaterial({ color: "#5a4a63" });
  const screenMat = new THREE.MeshBasicMaterial({ map: screen?.texture || null, color: screen ? "#ffffff" : "#26303c", toneMapped: false });
  const body = add(new THREE.BoxGeometry(1.15, 0.84, 0.6), shell, 0, 0.82, 0);
  const scr = add(new THREE.PlaneGeometry(0.92, 0.66), screenMat, 0, 0.82, 0.302);
  add(new THREE.CylinderGeometry(0.1, 0.22, 0.42, 14), dark, 0, 0.2, 0);
  const ant = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6);
  const a1 = add(ant, dark, -0.16, 1.42, -0.05); a1.rotation.z = 0.5;
  const a2 = new THREE.Mesh(ant, dark); a2.position.set(0.16, 1.42, -0.05); a2.rotation.z = -0.5; group.add(a2);
  return {
    group, screenMesh: scr, hit: [body, scr],
    dispose() { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); screenMat.dispose(); group.removeFromParent(); },
  };
}

export function makeSofa(THREE, color = "#6fc7a0") {
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color });
  const geos = [];
  const box = (w, h, d, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, h, d); geos.push(geo);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m;
  };
  // assise devant (+z), dossier derrière (-z)
  box(2.4, 0.32, 1.1, 0, 0.16, 0);
  box(2.4, 0.62, 0.3, 0, 0.5, -0.55);
  box(0.3, 0.5, 1.1, -1.2, 0.36, 0);
  box(0.3, 0.5, 1.1, 1.2, 0.36, 0);
  return { group, dispose() { geos.forEach((x) => x.dispose()); mat.dispose(); group.removeFromParent(); } };
}

// ---------------------------------------------------------------------
// L'activité
// ---------------------------------------------------------------------
const LINES = {
  "dessin-anime": ["Hihi, il est rigolo !", "Encore une bêtise !", "Ha ha ha !"],
  nature: ["Ooh, un oiseau...", "C'est beau dehors...", "Regarde, ça vole !"],
  cuisine: ["Miam... j'ai faim maintenant.", "Ça sent bon jusqu'ici !", "On en fait aussi ?"],
  sport: ["Allez, allez !", "Il court vite !", "Buuut ?"],
};
const FACES = {
  "dessin-anime": { eyes: "arc", brows: "raised", mouth: "laugh" },
  nature: { eyes: "wide", brows: "raised", mouth: "o" },
  cuisine: { eyes: "shiny", brows: "neutral", mouth: "tongue" },
  sport: { eyes: "wide", brows: "raised", mouth: "open" },
};
const pick = (list, i) => list[Math.abs(i) % list.length];

export default {
  id: "tele",
  start(ctx) {
    const { creature, THREE, store, inventory } = ctx;
    const { scene, camera, renderer } = creature.three;
    const tastes = ctx.tastes || store?.tastes || {};
    const favIdx = TV_CHANNELS.findIndex((c) => c.id === tastes.channel);
    const day = dayIndex();
    const s = STAGE_SCALE[store?.stage] ?? 1;

    // --- décor ---
    const root = new THREE.Group();
    scene.add(root);
    const screen = createScreen(THREE);
    screen.off();
    const tv = makeTv(THREE, screen);
    const sofa = makeSofa(THREE);
    const TV_POS = [-1.7, -1.5], HER = [0.35, 0.35];
    const yawToTv = Math.atan2(TV_POS[0] - HER[0], TV_POS[1] - HER[1]);
    tv.group.position.set(TV_POS[0], 0, TV_POS[1]);
    tv.group.rotation.y = Math.atan2(HER[0] - TV_POS[0], HER[1] - TV_POS[1]);
    sofa.group.position.set(HER[0] - Math.sin(yawToTv) * 0.05, 0, HER[1] - Math.cos(yawToTv) * 0.05);
    sofa.group.rotation.y = yawToTv; // assise tournée vers la télé, dossier derrière elle
    sofa.group.scale.setScalar(Math.max(0.7, s));
    root.add(tv.group, sofa.group);

    // --- cadrage : de 3/4 arrière, télé bien visible ; on recule sur un écran étroit ---
    const rect = renderer.domElement.getBoundingClientRect();
    const aspect = rect.width / Math.max(1, rect.height) || 0.6;
    const k = Math.min(1.6, Math.max(1, 0.8 / aspect));
    const tgt = [-0.55, 0.75, -0.45];
    creature.setCamera({ position: [tgt[0] + 2.7 * k, tgt[1] + 1.55 * k, tgt[2] + 5.1 * k], target: tgt, fov: 32 });

    // --- elle, assise ---
    const yawToCam = Math.atan2(2.7, 5.1) * 0.6;
    const pose = { x: HER[0], y: 0.26 * Math.max(0.7, s), z: HER[1], yaw: yawToTv, posture: "sit", arms: "rest", motion: "calm", face: null, lockSpin: true };
    const setPose = (patch) => { Object.assign(pose, patch); creature.setPuppet(pose); };
    setPose({});

    // --- état ---
    let t = 0, paused = false, stopped = false;
    let ch = favIdx >= 0 ? (favIdx + 1 + (day % (TV_CHANNELS.length - 1))) % TV_CHANNELS.length : day % TV_CHANNELS.length;
    let on = false, zapUntil = 0, onChannelFor = 0, reacted = false, boredSaid = false, hinted = false;
    let turnUntil = 0, faceUntil = 0, favFound = false, zaps = 0, ending = false, lastHudSec = -1;
    const watched = new Float32Array(TV_CHANNELS.length);
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    ctx.setScore(0);

    const hud = () => ctx.setHud({ text: on ? TV_CHANNELS[ch].label : "La télé s'allume...", timeLeft: Math.max(0, Math.ceil(DURATION - t)) });
    hud();

    function react() {
      reacted = true;
      const id = TV_CHANNELS[ch].id;
      if (ch === favIdx) {
        favFound = true;
        let line = "C'est ma chaîne préférée !";
        try { line = store?.tasteReactionFor?.("channel", id)?.line || line; } catch { /* ignoré */ }
        try { inventory?.revealTaste?.("channel", tastes); } catch { /* ignoré */ }
        setPose({ face: { eyes: "heart", brows: "raised", mouth: "laugh", extras: ["hearts", "blush"] }, arms: "up", motion: "sway" });
        turnUntil = t + 1.8; faceUntil = t + 4;
        ctx.say(line, 2600);
        ctx.beep("love"); ctx.haptic([12, 40, 12]);
      } else {
        setPose({ face: { ...FACES[id], extras: id === "dessin-anime" ? ["blush"] : [] }, arms: id === "sport" ? "up" : "rest", motion: id === "dessin-anime" ? "sway" : "calm" });
        faceUntil = t + 2.6;
        if (zaps < 3 || Math.random() < 0.5) ctx.say(pick(LINES[id], day + ch + zaps), 2000);
      }
    }

    function zap() {
      if (ending) return;
      zaps++;
      ch = (ch + 1) % TV_CHANNELS.length;
      zapUntil = t + 0.35;
      onChannelFor = 0; reacted = false; boredSaid = false;
      ctx.beep("zap"); ctx.haptic(8);
      if (!faceUntil || t > faceUntil) setPose({ face: { eyes: "wide", brows: "raised", mouth: "o" } });
      faceUntil = t + 0.5;
      hud();
    }

    function cuddle() {
      setPose({ face: { eyes: "closed", brows: "neutral", mouth: "content", extras: ["blush", "hearts"] }, arms: "hug" });
      faceUntil = t + 1.6; turnUntil = Math.max(turnUntil, t + 0.9);
      ctx.beep("love"); ctx.haptic(10);
      if (Math.random() < 0.4) ctx.say(pick(["On est bien là...", "Câlin télé !", "Reste avec moi."], zaps + day), 1600);
    }

    const off = creature.onFrame((dt) => {
      if (paused || stopped) return;
      t += dt;
      // allumage
      if (!on && t > 0.8) { on = true; zapUntil = t + 0.4; ctx.beep("zap"); hud(); }
      if (on && !ending) {
        if (t < zapUntil) screen.noise(t);
        else {
          screen.draw(ch, t);
          onChannelFor += dt;
          watched[ch] += dt;
          if (!reacted && onChannelFor > 1.1) react();
          if (ch !== favIdx && !boredSaid && onChannelFor > 7) {
            boredSaid = true;
            setPose({ face: { eyes: "flat", brows: "skeptic", mouth: "flat" } }); faceUntil = t + 2;
            ctx.say(hinted ? "Bof... on zappe ?" : "Tu peux changer de chaîne ? Touche la télé !", 2200);
            hinted = true;
          }
        }
      }
      // retour au visage tranquille, et vers la télé après s'être tournée vers toi
      if (faceUntil && t > faceUntil) { faceUntil = 0; setPose({ face: null, arms: "rest", motion: "calm" }); }
      const wantYaw = t < turnUntil ? yawToCam : yawToTv;
      if (pose.yaw !== wantYaw) setPose({ yaw: wantYaw });
      // fin tout en douceur
      if (!ending && t > DURATION - 3) {
        ending = true;
        screen.fin();
        setPose({ face: { eyes: "tired", brows: "neutral", mouth: "o" }, arms: "rest", motion: "calm" });
        faceUntil = 0;
        ctx.say(favFound ? "C'était trop bien... on recommence demain ?" : "Mmh... c'était bien.", 2400);
        ctx.beep("end");
      }
      const sec = Math.ceil(DURATION - t);
      if (sec !== lastHudSec) { lastHudSec = sec; hud(); }
      if (t >= DURATION) {
        let best = 0;
        for (let i = 1; i < watched.length; i++) if (watched[i] > watched[best]) best = i;
        // la chaîne préférée compte dès qu'elle l'a vraiment regardée
        if (favIdx >= 0 && watched[favIdx] >= 2) best = favIdx;
        const channel = watched[best] > 0 ? TV_CHANNELS[best].id : null;
        ctx.end({ score: 0, channel: channel === "sport" ? null : channel, details: { channel, favFound, zaps } });
      }
    });

    return {
      tap(x, y, ev) {
        if (stopped || paused || ev?.type === "swipe") return;
        ndc.set(x, y);
        ray.setFromCamera(ndc, camera);
        if (on && ray.intersectObjects(tv.hit, false).length) zap();
        else if (ray.intersectObject(creature.three.char, true).length) cuddle();
        else if (on) zap(); // sur un petit écran, un tap n'importe où zappe aussi
      },
      pause() { paused = true; },
      resume() { paused = false; },
      stop() {
        if (stopped) return;
        stopped = true;
        off();
        tv.dispose(); sofa.dispose(); screen.dispose();
        root.removeFromParent();
      },
    };
  },
};
