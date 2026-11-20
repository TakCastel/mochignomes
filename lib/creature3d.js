// lib/creature3d.js
// Le personnage en 3D (Three.js). Module autonome : il dessine la créature
// dans un conteneur et expose une petite API pour la piloter.
//
//   const creature = createCreature(container, { onPoke })
//   creature.setLook({ eyes, brows, mouth, extras, gaze, posture, arms, motion, morph })
//   creature.hop(0.3)   creature.blop()   creature.say("Miam !")   creature.dispose()
//
// Voir CATALOG pour la liste des valeurs possibles de chaque canal.
import * as THREE from "three";
import { buildWorld } from "./world3d.js";

export const CATALOG = {
  eyes: ["dot", "wide", "shiny", "arc", "closed", "tired", "flat", "squint", "x", "spiral", "heart", "star"],
  brows: ["none", "neutral", "raised", "angry", "sad", "evil", "skeptic"],
  mouth: ["smile", "content", "laugh", "grin", "flat", "smirk", "pout", "frown", "o", "open", "scream", "teeth", "evil", "tongue", "wavy", "kiss"],
  extras: ["blush", "tear", "tears", "sweat", "vein", "zzz", "hearts", "halo"],
  posture: ["stand", "sit", "crouch", "side", "back"],
  arms: ["rest", "hang", "up", "wave", "hug", "flex", "hips"],
  motion: ["calm", "hop", "dance", "shake", "sway", "snore"],
};

const ORANGE = "#f8a33b";
const OUTLINE = "#5a2e14";
const MKEYS = ["belly", "muscle", "slump", "sick", "dirt", "dead"];

// ---------------------------------------------------------------------
// Dessin du visage sur la texture de peau
// ---------------------------------------------------------------------
const TEX_W = 2048, TEX_H = 1024, PX = TEX_W / (2 * Math.PI);

function uvp(px, py) {
  const theta = Math.acos(py);
  const s = Math.sin(theta);
  const phi = Math.asin(Math.max(-1, Math.min(1, px / s)));
  return [TEX_W * 0.25 + phi * PX, (theta / Math.PI) * TEX_H];
}

function makePainter(ctx) {
  const ink = (w = 13) => {
    ctx.strokeStyle = OUTLINE; ctx.fillStyle = OUTLINE; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
  };
  const line = (points, w = 13) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = w; ctx.stroke();
  };
  const heartPath = (cx, cy, r) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.6, cy - r * 0.1, cx - r * 0.8, cy - r * 1.3, cx, cy - r * 0.45);
    ctx.bezierCurveTo(cx + r * 0.8, cy - r * 1.3, cx + r * 1.6, cy - r * 0.1, cx, cy + r * 0.9);
    ctx.closePath();
  };
  const starPath = (cx, cy, r) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  };

  function drawEye(type, cx, cy, s, blink, gx, gy) {
    ink();
    if (["dot", "wide", "shiny", "tired"].includes(type) && blink) {
      ctx.beginPath(); ctx.arc(cx, cy - 6, 24, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      return;
    }
    const ex = cx + gx * 12, ey = cy + gy * 10;
    switch (type) {
      case "dot":
      case "tired":
        ctx.beginPath(); ctx.ellipse(ex, ey, 21, 28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex - 6, ey - 10, 7, 0, Math.PI * 2); ctx.fill();
        if (type === "tired") {
          ctx.fillStyle = ORANGE; ctx.fillRect(cx - 40, cy - 46, 80, 44);
          line([[cx - 30, cy - 2], [cx + 30, cy - 2]]);
        }
        break;
      case "wide":
        ctx.fillStyle = "#fff"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(cx, cy, 33, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.ellipse(cx + gx * 13, cy + gy * 14, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + gx * 13 - 4, cy + gy * 14 - 6, 5, 0, Math.PI * 2); ctx.fill();
        break;
      case "shiny":
        ctx.beginPath(); ctx.ellipse(ex, ey, 27, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ex - 8, ey - 12, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex + 9, ey + 11, 5, 0, Math.PI * 2); ctx.fill();
        break;
      case "arc":
        ctx.beginPath(); ctx.arc(cx, cy + 14, 34, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); break;
      case "closed":
        ctx.beginPath(); ctx.arc(cx, cy - 14, 30, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); break;
      case "flat":
        line([[cx - 28, cy + 2], [cx + 28, cy + 2]]); break;
      case "squint": {
        const d = s < 0 ? 1 : -1;
        line([[cx - 20 * d, cy - 20], [cx + 18 * d, cy], [cx - 20 * d, cy + 20]]); break;
      }
      case "x":
        line([[cx - 22, cy - 22], [cx + 22, cy + 22]]); line([[cx + 22, cy - 22], [cx - 22, cy + 22]]); break;
      case "spiral":
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.1) {
          const r = 2 + a * 2.1, x = cx + Math.cos(a * s) * r, y = cy + Math.sin(a * s) * r;
          a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.lineWidth = 9; ctx.stroke(); break;
      case "heart":
        heartPath(cx, cy, 30); ctx.fillStyle = "#ee4d6a"; ctx.fill(); ctx.lineWidth = 8; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 12, cy - 12, 6, 0, Math.PI * 2); ctx.fill(); break;
      case "star":
        starPath(cx, cy, 38); ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.lineWidth = 8; ctx.stroke(); break;
    }
  }

  function drawBrow(type, cx, cy, s) {
    ink(11);
    switch (type) {
      case "neutral": ctx.beginPath(); ctx.arc(cx, cy + 10, 52, 1.36 * Math.PI, 1.64 * Math.PI); ctx.stroke(); break;
      case "raised": ctx.beginPath(); ctx.arc(cx, cy - 26, 36, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
      case "angry": line([[cx - 30 * s, cy - 34], [cx + 26 * s, cy - 56]], 12); break;
      case "sad": line([[cx - 30 * s, cy - 56], [cx + 26 * s, cy - 38]], 11); break;
      case "evil": line([[cx - 34 * s, cy - 24], [cx + 30 * s, cy - 58], [cx + 40 * s, cy - 54]], 15); break;
      case "skeptic":
        if (s < 0) { ctx.beginPath(); ctx.arc(cx, cy - 30, 34, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
        else line([[cx - 30, cy - 40], [cx + 30, cy - 36]], 12);
        break;
    }
  }

  function drawMouth(type, mx, my) {
    ink();
    const DARK = "#6e1f14", TONGUE = "#e8604c";
    const openShape = (w, h, teeth = false) => {
      const path = new Path2D();
      path.moveTo(mx - w / 2, my - h * 0.3);
      path.quadraticCurveTo(mx, my - h * 0.42, mx + w / 2, my - h * 0.3);
      path.bezierCurveTo(mx + w / 2, my + h * 0.95, mx - w / 2, my + h * 0.95, mx - w / 2, my - h * 0.3);
      path.closePath();
      ctx.fillStyle = DARK; ctx.fill(path);
      ctx.save(); ctx.clip(path);
      ctx.fillStyle = TONGUE; ctx.beginPath(); ctx.ellipse(mx, my + h * 0.62, w * 0.32, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      if (teeth) { ctx.fillStyle = "#fff"; ctx.fillRect(mx - w / 2, my - h * 0.5, w, h * 0.38); }
      ctx.restore();
      ctx.stroke(path);
    };
    const oval = (rx, ry, tongue = false) => {
      const path = new Path2D(); path.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = DARK; ctx.fill(path);
      if (tongue) {
        ctx.save(); ctx.clip(path); ctx.fillStyle = TONGUE;
        ctx.beginPath(); ctx.ellipse(mx, my + ry * 0.8, rx * 0.7, ry * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.stroke(path);
    };
    switch (type) {
      case "smile": ctx.beginPath(); ctx.arc(mx, my - 34, 48, 0.24 * Math.PI, 0.76 * Math.PI); ctx.stroke(); break;
      case "content": ctx.beginPath(); ctx.arc(mx, my - 36, 62, 0.22 * Math.PI, 0.78 * Math.PI); ctx.stroke(); break;
      case "laugh": openShape(122, 66); break;
      case "grin": openShape(156, 80, true); break;
      case "flat": line([[mx - 34, my], [mx + 34, my]]); break;
      case "smirk": ctx.beginPath(); ctx.moveTo(mx - 38, my + 4); ctx.quadraticCurveTo(mx + 6, my + 16, mx + 36, my - 14); ctx.stroke(); break;
      case "pout": ctx.beginPath(); ctx.arc(mx, my + 30, 30, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); break;
      case "frown": ctx.beginPath(); ctx.arc(mx, my + 44, 46, 1.22 * Math.PI, 1.78 * Math.PI); ctx.stroke(); break;
      case "o": oval(17, 22); break;
      case "open": oval(34, 24, true); break;
      case "scream": oval(40, 52, true); break;
      case "teeth": {
        const w = 116, h = 42;
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(mx - w / 2, my - h / 2, w, h, 16); ctx.fill(); ctx.stroke();
        line([[mx - w / 2 + 6, my], [mx + w / 2 - 6, my]], 6);
        for (let i = -2; i <= 2; i++) line([[mx + i * 20, my - h / 2 + 4], [mx + i * 20, my + h / 2 - 4]], 6);
        break;
      }
      case "evil": {
        const path = new Path2D();
        path.moveTo(mx - 80, my - 22);
        path.quadraticCurveTo(mx, my + 6, mx + 80, my - 22);
        path.quadraticCurveTo(mx, my + 78, mx - 80, my - 22);
        path.closePath();
        ctx.fillStyle = DARK; ctx.fill(path);
        ctx.save(); ctx.clip(path); ctx.fillStyle = "#fff"; ctx.beginPath();
        ctx.moveTo(mx - 80, my - 30);
        for (let x = -64, up = false; x <= 80; x += 16, up = !up) ctx.lineTo(mx + x, my + (up ? -20 : 12));
        ctx.lineTo(mx + 80, my - 30); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.stroke(path);
        break;
      }
      case "tongue":
        ctx.fillStyle = TONGUE;
        ctx.beginPath(); ctx.roundRect(mx + 2, my - 4, 34, 42, [0, 0, 17, 17]); ctx.fill();
        ctx.lineWidth = 9; ctx.stroke();
        line([[mx - 42, my + 6], [mx, my - 2], [mx + 42, my + 6]]); break;
      case "wavy": {
        const pts = [];
        for (let x = -50; x <= 50; x += 4) pts.push([mx + x, my + Math.sin((x / 50) * Math.PI * 2) * 9]);
        line(pts, 11); break;
      }
      case "kiss":
        ctx.beginPath(); ctx.arc(mx - 4, my - 11, 12, -0.6 * Math.PI, 0.5 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx - 4, my + 13, 12, -0.5 * Math.PI, 0.6 * Math.PI); ctx.stroke(); break;
    }
  }

  return function drawSkin(f) {
    ctx.fillStyle = ORANGE; ctx.fillRect(0, 0, TEX_W, TEX_H);
    const [bx, by] = uvp(0, -0.35);
    const g = ctx.createRadialGradient(bx, by, 10, bx, by, 300);
    g.addColorStop(0, "rgba(255,200,110,0.55)"); g.addColorStop(1, "rgba(255,200,110,0)");
    ctx.fillStyle = g; ctx.fillRect(bx - 320, by - 320, 640, 640);

    if (f.muscle > 0.05) {
      ctx.save(); ctx.globalAlpha = Math.min(1, f.muscle * 1.2);
      ctx.strokeStyle = "#c2621b"; ctx.lineCap = "round";
      for (const s of [-1, 1]) {
        const [px, py] = uvp(0.24 * s, -0.12);
        ctx.beginPath(); ctx.arc(px, py - 40, 70, 0.25 * Math.PI, 0.75 * Math.PI); ctx.lineWidth = 9; ctx.stroke();
      }
      for (let r = 0; r < 3; r++) for (const s of [-1, 1]) {
        const [ax, ay] = uvp(0.09 * s, -0.36 - r * 0.13);
        ctx.beginPath(); ctx.moveTo(ax - 22, ay); ctx.quadraticCurveTo(ax, ay + 10, ax + 22, ay); ctx.lineWidth = 8; ctx.stroke();
      }
      const [nx, ny] = uvp(0, -0.36), [, ny2] = uvp(0, -0.72);
      ctx.beginPath(); ctx.moveTo(nx, ny - 10); ctx.lineTo(nx, ny2); ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    }
    if (f.dirt > 0.05) {
      ctx.save(); ctx.globalAlpha = 0.55 * f.dirt; ctx.fillStyle = "#6b4220";
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const [sx, sy] of [[-0.5, -0.3], [0.45, -0.52], [0.25, 0.7], [-0.28, -0.68], [0.72, 0.1], [-0.74, 0.12], [0.08, -0.25], [-0.55, 0.55]]) {
        const [x, y] = uvp(sx, sy);
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 30, 10 + rnd() * 18, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
    if (f.extras.has("blush")) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = "#f2705a";
      for (const s of [-1, 1]) { const [x, y] = uvp(0.6 * s, 0.25); ctx.beginPath(); ctx.ellipse(x, y, 40, 24, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (f.extras.has("tears")) {
      ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = "#79c8ff"; ctx.lineCap = "round"; ctx.lineWidth = 22;
      for (const s of [-1, 1]) {
        const [x, y] = uvp(0.38 * s, 0.33), [, y2] = uvp(0.4 * s, -0.25);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14 * s, (y + y2) / 2, x + 6 * s, y2); ctx.stroke();
      }
      ctx.restore();
    }
    for (const s of [-1, 1]) {
      const [x, y] = uvp(0.34 * s, 0.4);
      drawBrow(f.brows, x, y, s);
      drawEye(f.eyes, x, y, s, f.blink, f.gazeX, f.gazeY);
    }
    const [mx, my] = uvp(0, 0.15);
    drawMouth(f.mouth, mx, my);

    if (f.extras.has("tear")) {
      const [x, y] = uvp(-0.42, 0.27);
      ctx.fillStyle = "#79c8ff"; ctx.strokeStyle = "#2f6fa8"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y - 26);
      ctx.bezierCurveTo(x + 22, y + 2, x + 16, y + 22, x, y + 22);
      ctx.bezierCurveTo(x - 16, y + 22, x - 22, y + 2, x, y - 26);
      ctx.fill(); ctx.stroke();
    }
    if (f.extras.has("sweat")) {
      const [x, y] = uvp(0.66, 0.6);
      ctx.fillStyle = "#a9dcff"; ctx.strokeStyle = "#2f6fa8"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x, y - 40);
      ctx.bezierCurveTo(x + 30, y, x + 22, y + 30, x, y + 30);
      ctx.bezierCurveTo(x - 22, y + 30, x - 30, y, x, y - 40);
      ctx.fill(); ctx.stroke();
    }
    if (f.extras.has("vein")) {
      const [x, y] = uvp(-0.58, 0.68);
      ctx.strokeStyle = "#d8322a"; ctx.lineWidth = 11; ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.translate(x, y); ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath(); ctx.arc(26, 26, 18, Math.PI, 1.5 * Math.PI); ctx.stroke(); ctx.restore();
      }
    }
  };
}

// ---------------------------------------------------------------------
// Forme du corps et déformations
// ---------------------------------------------------------------------
const SY = 1.13;
const BOTTOM = (-0.72 - 0.28 * 0.45) * SY;
const FOOT_H = 0.16;
const CENTER = FOOT_H - BOTTOM;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (cur, target, k) => cur + (target - cur) * k;

function deform(px, py, pz, P, out) {
  const widen = (1 - 0.07 * py) * (1 + 0.07 * (1 - py * py));
  let x = px * widen, z = pz * widen * 0.9, y = py;
  if (y < -0.72) y = -0.72 + (y + 0.72) * 0.45;
  y *= SY;
  if (P.belly > 0) {
    const dx = px, dy = py + 0.3, dz = pz - 0.9;
    const k = P.belly * 0.42 * Math.exp(-(dx * dx * 1.6 + dy * dy * 2.2 + dz * dz * 1.5));
    x += px * k; y += py * k * 0.5; z += pz * k;
    const w = 1 + P.belly * 0.18 * clamp(0.25 - py, 0, 1.2);
    x *= w; z *= w;
  }
  if (P.muscle > 0) {
    const m = P.muscle;
    let k = 0;
    for (const s of [-1, 1]) {
      const dx = px - s * 0.8, dy = py - 0.02, dz = pz - 0.25;
      k += 0.2 * Math.exp(-(dx * dx + dy * dy + dz * dz) / 0.12);
      const ex = Math.abs(px) - 0.3, ey = py + 0.1, ez = pz - 0.92;
      if (Math.sign(px) === s) k += 0.07 * Math.exp(-(ex * ex + ey * ey + ez * ez) / 0.05);
    }
    x += px * k * m; y += py * k * m; z += pz * k * m;
    x *= 1 + m * 0.12 * clamp(py + 0.4, 0, 1) - m * 0.06 * clamp(-py - 0.2, 0, 1);
  }
  if (P.slump > 0) {
    const s = P.slump;
    y = BOTTOM + (y - BOTTOM) * (1 - 0.16 * s);
    const low = clamp((0.3 - py) / 1.3, 0, 1);
    x *= 1 + 0.15 * s * low; z *= 1 + 0.1 * s * low;
    z += s * 0.06 * clamp(py, 0, 1);
  }
  return out.set(x, y, z);
}

// « Flop » : la masse s'affaisse vers le sol comme une gelée.
const _perp = new THREE.Vector3();
function flop(q, down, f) {
  const h = q.dot(down);
  if (f <= 0.001) return h;
  let hn = h * (1 - 0.2 * f);
  const hc = 0.58;
  if (hn > hc) hn = hc + (hn - hc) * Math.max(0.05, 1 - 0.85 * f);
  _perp.copy(q).addScaledVector(down, -h).multiplyScalar(1 + 0.15 * f * (0.6 + 0.4 * Math.max(0, h)));
  q.copy(_perp).addScaledVector(down, hn);
  return hn;
}

const POSTURES = {
  stand:  { rx: 0,     rz: 0,    dy: 0,    lift: FOOT_H, footZ: 0.18, footY: 0.12, footRX: 0,    squash: 1,   flop: 0 },
  sit:    { rx: -0.12, rz: 0,    dy: 0,    lift: 0,      footZ: 0.95, footY: 0.18, footRX: -0.9, squash: 1,   flop: 0.4 },
  crouch: { rx: 0.08,  rz: 0,    dy: 0,    lift: 0.06,   footZ: 0.28, footY: 0.12, footRX: 0,    squash: 0.9, flop: 0.35 },
  side:   { rx: 0.1,   rz: 1.48, dy: 0.1,  lift: FOOT_H, footZ: 0.18, footY: 0.12, footRX: 0,    squash: 1,   flop: 1 },
  back:   { rx: -0.55, rz: 1.5,  dy: 0.05, lift: FOOT_H, footZ: 0.18, footY: 0.12, footRX: 0,    squash: 1,   flop: 1 },
};

const ARMS = {
  rest: [{ a: 0.75, x: -0.15, e: 0, f: 0 }, { a: 0.75, x: -0.15, e: 0, f: 0 }],
  hang: [{ a: 0.28, x: 0, e: 0, f: 0 }, { a: 0.28, x: 0, e: 0, f: 0 }],
  up:   [{ a: 2.6, x: -0.2, e: 0, f: 0 }, { a: 2.6, x: -0.2, e: 0, f: 0 }],
  wave: [{ a: 0.75, x: -0.15, e: 0, f: 0 }, { a: 2.35, x: -0.25, e: 0, f: 0, wave: true }],
  hug:  [{ a: 0.6, x: -1.35, e: 0, f: 0 }, { a: 0.6, x: -1.35, e: 0, f: 0 }],
  flex: [{ a: 1.75, x: -0.15, e: 1.4, f: 1 }, { a: 1.75, x: -0.15, e: 1.4, f: 1 }],
  hips: [{ a: 1.35, x: 0.1, e: -2.3, f: 1 }, { a: 1.35, x: 0.1, e: -2.3, f: 1 }],
};

const OVERLAY_CSS = `
.c3d-bubble { position:absolute; transform:translate(-50%,-100%) scale(.85); background:#fff; color:#5a3a22;
  border-radius:22px; padding:9px 16px; font:700 16px "Fredoka","Nunito",system-ui,sans-serif;
  box-shadow:0 6px 16px rgba(60,40,20,.22), inset 0 -2px 0 rgba(200,170,130,.25);
  white-space:nowrap; pointer-events:none; opacity:0; transition:opacity .25s, transform .3s cubic-bezier(.3,1.6,.5,1); z-index:2; }
.c3d-bubble::after { content:""; position:absolute; left:50%; bottom:-9px; margin-left:-9px;
  border:9px solid transparent; border-bottom:0; border-top-color:#fff; }
.c3d-bubble.show { opacity:1; transform:translate(-50%,-100%) scale(1); }
.c3d-floaty { position:absolute; pointer-events:none; font-weight:900; font-size:26px; opacity:0; transition:opacity .4s; }
.c3d-floaty.show { opacity:1; }
.c3d-floaty span { position:absolute; animation:c3d-float 2.4s ease-in infinite; opacity:0; }
.c3d-floaty span:nth-child(2) { animation-delay:.8s; font-size:.8em; }
.c3d-floaty span:nth-child(3) { animation-delay:1.6s; font-size:.65em; }
.c3d-zzz { color:#6d7fd6; }
.c3d-hearts { color:#ee4d6a; }
@keyframes c3d-float { 0% { transform:translate(0,0); opacity:0; } 20% { opacity:1; } 100% { transform:translate(40px,-70px); opacity:0; } }
@media (prefers-reduced-motion: reduce) { .c3d-floaty span { animation-duration:6s; } }
`;

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------
// Création de la créature
// ---------------------------------------------------------------------
export function createCreature(container, { onPoke, onGround, onSpin, world: withWorld = false } = {}) {
  if (!document.getElementById("c3d-style")) {
    const st = document.createElement("style");
    st.id = "c3d-style"; st.textContent = OVERLAY_CSS;
    document.head.appendChild(st);
  }
  const overlay = (cls, html = "") => {
    const el = document.createElement("div");
    el.className = cls; el.innerHTML = html;
    container.appendChild(el);
    return el;
  };
  const bubble = overlay("c3d-bubble");
  const zzz = overlay("c3d-floaty c3d-zzz", "<span>Z</span><span>Z</span><span>Z</span>");
  const heartsEl = overlay("c3d-floaty c3d-hearts", "<span>♥</span><span>♥</span><span>♥</span>");

  // état demandé de l'extérieur
  const look = {
    eyes: "dot", brows: "none", mouth: "smile", extras: new Set(), gaze: null,
    posture: "stand", arms: "rest", motion: "calm",
  };
  const morphCur = Object.fromEntries(MKEYS.map((k) => [k, 0]));
  const morphTarget = { ...morphCur };

  // --- rendu
  // Avec le décor, le canvas est opaque (le ciel est dessiné dans la 3D) : le navigateur
  // n'a plus à le mélanger avec la page à chaque image. Pas d'anticrénelage sur les
  // écrans haute densité, où il ne se voit pas mais coûte cher.
  const dpr = window.devicePixelRatio || 1;
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 2, alpha: !withWorld, powerPreference: "high-performance" });
  // Résolution plafonnée, puis ajustée selon la fluidité réelle de l'appareil
  const maxRatio = Math.min(dpr, withWorld ? 1.5 : 1.75);
  let pixelRatio = Math.min(maxRatio, withWorld ? 1.15 : 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.6, 8.6);
  camera.lookAt(0, 0.95, 0);

  const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0xb7774a, 1.35);
  scene.add(hemiLight);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-2.5, 4, 5);
  scene.add(sun);

  const gradientMap = new THREE.DataTexture(new Uint8Array([95, 190, 255]), 3, 1, THREE.RedFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  const outlineMaterial = (thickness) => new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(OUTLINE) }, thickness: { value: thickness } },
    vertexShader: `
      uniform float thickness;
      void main() {
        vec3 p = position + normalize(normal) * thickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
  const outlineBody = outlineMaterial(0.032);
  const outlineSmall = outlineMaterial(0.026);
  const withOutline = (mesh, mat = outlineSmall) => { mesh.add(new THREE.Mesh(mesh.geometry, mat)); return mesh; };

  // --- peau
  const skinCanvas = document.createElement("canvas");
  skinCanvas.width = TEX_W / 2; skinCanvas.height = TEX_H / 2;
  const skinCtx = skinCanvas.getContext("2d");
  const paint = makePainter(skinCtx);
  // on dessine en coordonnées pleine taille, réduites de moitié à l'écriture
  const drawSkin = (f) => { skinCtx.setTransform(0.5, 0, 0, 0.5, 0, 0); paint(f); };
  const skinTex = new THREE.CanvasTexture(skinCanvas);
  skinTex.colorSpace = THREE.SRGBColorSpace;
  skinTex.anisotropy = 4;

  // --- corps
  const bodyGeo = new THREE.SphereGeometry(1, 72, 54);
  const basePos = bodyGeo.attributes.position.array.slice();
  const seamGroups = (() => {
    const map = new Map();
    for (let i = 0; i < basePos.length / 3; i++) {
      const key = `${basePos[i * 3].toFixed(4)},${basePos[i * 3 + 1].toFixed(4)},${basePos[i * 3 + 2].toFixed(4)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(i);
    }
    return [...map.values()].filter((g) => g.length > 1);
  })();

  const tmp = new THREE.Vector3();
  let contactRest = -BOTTOM, contactNow = -BOTTOM;
  function rebuildBody(P) {
    const pos = bodyGeo.attributes.position;
    let m0 = -Infinity, m1 = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      deform(basePos[i * 3], basePos[i * 3 + 1], basePos[i * 3 + 2], P, tmp);
      m0 = Math.max(m0, tmp.dot(P.down));
      m1 = Math.max(m1, flop(tmp, P.down, P.flop));
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    contactRest = m0; contactNow = m1;
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();
    const n = bodyGeo.attributes.normal;
    for (const g of seamGroups) {
      tmp.set(0, 0, 0);
      for (const i of g) tmp.x += n.getX(i), tmp.y += n.getY(i), tmp.z += n.getZ(i);
      tmp.normalize();
      for (const i of g) n.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    n.needsUpdate = true;
    bodyGeo.computeBoundingSphere();
  }
  const deformFull = (px, py, pz, P, out) => { deform(px, py, pz, P, out); flop(out, P.down, P.flop); return out; };

  const bodyMat = new THREE.MeshToonMaterial({ map: skinTex, gradientMap });
  const limbMat = new THREE.MeshToonMaterial({ color: ORANGE, gradientMap });

  const char = new THREE.Group();
  const spin = new THREE.Group(); // rotation au doigt
  const poseGroup = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -CENTER;
  poseGroup.add(inner);
  spin.add(poseGroup);
  char.add(spin);
  scene.add(char);
  const bodyGroup = new THREE.Group();
  inner.add(bodyGroup);
  const body = withOutline(new THREE.Mesh(bodyGeo, bodyMat), outlineBody);
  body.position.y = -BOTTOM;
  bodyGroup.add(body);

  const feet = [];
  for (const s of [-1, 1]) {
    const foot = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), limbMat));
    foot.scale.set(1, 0.62, 1.15);
    inner.add(foot);
    feet.push({ s, foot });
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const upper = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 8, 20), limbMat));
    upper.position.y = -0.17;
    pivot.add(upper);
    const biceps = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), limbMat));
    biceps.position.set(-s * 0.04, -0.2, 0.02);
    pivot.add(biceps);
    const elbow = new THREE.Group();
    elbow.position.y = -0.36;
    pivot.add(elbow);
    const fore = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.2, 8, 20), limbMat));
    elbow.add(fore);
    const fist = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), limbMat));
    elbow.add(fist);
    body.add(pivot);
    arms.push({ s, pivot, upper, biceps, elbow, fore, fist, cur: { ...ARMS.rest[0] } });
  }

  const tuftGroup = new THREE.Group();
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.12, 0), new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0.04, 0.3, 0), new THREE.Vector3(0.16, 0.42, 0), new THREE.Vector3(0.3, 0.43, 0),
    ]);
    const TS = 40, RS = 16;
    const geo = new THREE.TubeGeometry(curve, TS, 0.1, RS, false);
    const p = geo.attributes.position;
    for (let i = 0; i <= TS; i++) {
      const t = i / TS, c = curve.getPointAt(t), taper = 1 - 0.5 * t * t;
      for (let j = 0; j <= RS; j++) {
        const k = i * (RS + 1) + j;
        p.setXYZ(k, c.x + (p.getX(k) - c.x) * taper, c.y + (p.getY(k) - c.y) * taper, c.z + (p.getZ(k) - c.z) * taper);
      }
    }
    geo.computeVertexNormals();
    tuftGroup.add(withOutline(new THREE.Mesh(geo, limbMat)));
    const tip = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), limbMat));
    tip.position.copy(curve.getPointAt(1));
    tuftGroup.add(tip);
  }
  tuftGroup.scale.setScalar(0.78);
  body.add(tuftGroup);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.05, 12, 48),
    new THREE.MeshToonMaterial({ color: "#ffd75e", gradientMap, emissive: "#6b5000" })
  );
  halo.rotation.x = Math.PI / 2 - 0.25;
  body.add(halo);

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  {
    const c = shadowCanvas.getContext("2d");
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(90,46,20,0.35)"); g.addColorStop(1, "rgba(90,46,20,0)");
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  const world = withWorld
    ? buildWorld(scene, { gradientMap, outline: outlineSmall, shadowTexture: shadow.material.map, hemi: hemiLight, sun })
    : null;

  function placeAttachments(P) {
    for (const a of arms) {
      const d = new THREE.Vector3(a.s * 0.93, -0.1, 0.22).normalize();
      deformFull(d.x, d.y, d.z, P, tmp);
      a.pivot.position.set(tmp.x * 0.9, tmp.y, tmp.z * 0.9);
    }
    deformFull(0, 1, 0, P, tmp);
    tuftGroup.position.copy(tmp);
    halo.position.set(0, tmp.y + 0.45, 0);
  }

  // --- interaction
  const say = (text, ms = 2600) => { bubble.textContent = text; bubbleUntil = performance.now() + ms; };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null, giggleUntil = 0, dizzyUntil = 0;
  // Faire tourner : glisser à l'horizontale, avec de l'élan au lâcher
  let dragging = false, lastX = 0, lastT = 0, spinAngle = 0, spinVel = 0, releasedAt = -10, restAngle = 0;
  const onDown = (e) => {
    downAt = [e.clientX, e.clientY];
    lastX = e.clientX; lastT = performance.now();
    dragging = false;
    renderer.domElement.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!downAt) return;
    if (!dragging && Math.abs(e.clientX - downAt[0]) > 8) dragging = true;
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const rot = (dx / Math.max(200, container.clientWidth)) * Math.PI * 1.6;
    spinAngle += rot;
    const dtm = Math.max(8, now - lastT) / 1000;
    spinVel = spinVel * 0.5 + (rot / dtm) * 0.5;
    lastX = e.clientX; lastT = now;
  };
  const onUp = (e) => {
    const wasDragging = dragging;
    dragging = false;
    if (!downAt) return;
    const start = downAt;
    downAt = null;
    if (wasDragging) {
      if (performance.now() - lastT > 80) spinVel = 0; // doigt arrêté avant le lâcher
      releasedAt = clock.elapsedTime;
      onSpin?.();
      if (Math.abs(spinVel) > 11 && morphCur.dead < 0.5) {
        dizzyUntil = clock.elapsedTime + 2.6;
        say(["Ouh là, tout tourne !", "Wooouh !", "Arrête, j'ai le tournis !"][Math.floor(Math.random() * 3)]);
      }
      return;
    }
    if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) return;
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (!raycaster.intersectObject(char, true).length) return;
    const dead = morphCur.dead > 0.5;
    const asleep = look.motion === "snore" || look.extras.has("zzz");
    if (!dead) {
      if (poseCur.flop > 0.5) flopVel += 6; else jigVel += 5;
      if (look.posture === "stand") hop(0.25);
      if (!asleep) giggleUntil = clock.elapsedTime + 0.9;
    }
    onPoke?.({ dead, asleep });
  };
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.cursor = "grab";
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointermove", onMove);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointercancel", onUp);

  // --- animation
  const clock = new THREE.Clock();
  let jig = 0, jigVel = 0, flopJig = 0, flopVel = 0;
  let hopStart = -10, hopPower = 0, nextHop = 3;
  let nextBlink = 2, blinkUntil = 0;
  let autoGaze = [0, 0], autoGazeTarget = [0, 0], nextGlance = 2;
  let lastSig = "", lastMorphSig = "", bubbleUntil = 0;
  const poseCur = { ...POSTURES.stand };
  const downLocal = new THREE.Vector3(0, -1, 0), invQ = new THREE.Quaternion();
  const tint = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1),
    SICK = new THREE.Color(0.55, 0.95, 0.42), DEAD = new THREE.Color(0.5, 0.5, 0.53), BASE = new THREE.Color(ORANGE);
  const headPt = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

  function hop(power) {
    const t = clock.elapsedTime;
    if (t - hopStart < 0.75) return;
    hopStart = t; hopPower = power;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Cadrage : le personnage garde la même taille par rapport à la largeur,
    // et ses pieds se posent vers le bas de la scène, quelle que soit sa hauteur.
    const aspect = w / h;
    const base = Math.tan(THREE.MathUtils.degToRad(withWorld ? 17 : 15));
    // écran haut : on élargit le champ ; écran large (paysage) : on resserre pour garder la créature grande
    let halfH = aspect < 1 ? base / aspect : base / Math.pow(aspect, 0.75);
    // cadrage imposé : la créature (environ 2,5 unités de haut, à 8,6 de la caméra) fait frame.size pixels
    if (framing?.size) halfH = (2.5 * h) / (2 * 8.6 * framing.size);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH));
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const g0 = new THREE.Vector3(0, 0, 0).project(camera);
    const groundNow = (-g0.y * 0.5 + 0.5) * h;
    const groundWanted = framing?.ground ?? h * (aspect < 0.9 ? 0.78 : 0.84);
    camera.setViewOffset(w, h, 0, groundNow - groundWanted, w, h);
    camera.updateProjectionMatrix();
    // signale où tombe le sol à l'écran, pour aligner le décor
    onGround?.(groundWanted);
  }
  let framing = null;
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const project = (v) => {
    const p = v.clone().project(camera);
    return [(p.x * 0.5 + 0.5) * container.clientWidth, (-p.y * 0.5 + 0.5) * container.clientHeight];
  };

  let raf = 0;
  let perfAcc = 0, perfFrames = 0, perfLast = performance.now();
  function adaptQuality() {
    const now = performance.now();
    perfAcc += now - perfLast; perfLast = now; perfFrames++;
    if (perfFrames < 45) return;
    const avg = perfAcc / perfFrames;
    perfAcc = 0; perfFrames = 0;
    // trop lent : on baisse la résolution ; très fluide : on la remonte
    const next = avg > 20 ? Math.max(0.7, pixelRatio - 0.2) : avg < 13 ? Math.min(maxRatio, pixelRatio + 0.15) : pixelRatio;
    if (next !== pixelRatio) { pixelRatio = next; renderer.setPixelRatio(pixelRatio); resize(); }
  }
  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    adaptQuality();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const k = Math.min(1, dt * 5);
    const kp = Math.min(1, dt * 4);

    // posture
    const P = POSTURES[look.posture] || POSTURES.stand;
    const prevFlop = poseCur.flop;
    for (const key in poseCur) poseCur[key] = approach(poseCur[key], P[key], kp);
    poseGroup.rotation.set(poseCur.rx, 0, poseCur.rz);
    downLocal.set(0, -1, 0).applyQuaternion(invQ.copy(poseGroup.quaternion).invert());
    if (P.flop > 0.5 && prevFlop < 0.75 && poseCur.flop >= 0.75) flopVel += 7;
    if (P.flop < 0.5 && prevFlop > 0.6 && poseCur.flop <= 0.6) flopVel -= 4;
    flopVel += (-140 * flopJig - 7 * flopVel) * dt;
    flopJig += flopVel * dt;
    const lying = poseCur.flop > 0.5;
    const dead = morphCur.dead > 0.5;
    const flopBreath = lying && !dead ? Math.round(Math.sin(t * (look.motion === "snore" ? 1.3 : 2.2)) * 4) * 0.02 : 0;

    // morphing
    for (const key of MKEYS) {
      morphCur[key] = approach(morphCur[key], morphTarget[key], k);
      if (Math.abs(morphCur[key] - morphTarget[key]) < 0.004) morphCur[key] = morphTarget[key];
    }
    morphCur.down = downLocal;
    morphCur.flop = Math.round(clamp(poseCur.flop + flopJig + flopBreath, 0, 1.5) * 100) / 100;
    const morphSig = MKEYS.map((key) => morphCur[key].toFixed(3)).join() + morphCur.flop.toFixed(3) +
      downLocal.x.toFixed(2) + downLocal.y.toFixed(2) + downLocal.z.toFixed(2);
    if (morphSig !== lastMorphSig) { lastMorphSig = morphSig; rebuildBody(morphCur); placeAttachments(morphCur); }
    tint.copy(WHITE).lerp(SICK, morphCur.sick).lerp(DEAD, morphCur.dead);
    bodyMat.color.copy(tint);
    limbMat.color.copy(BASE).multiply(tint);

    // regard : imposé, ou petits coups d'œil spontanés
    if (t > nextGlance) {
      autoGazeTarget = Math.random() < 0.4 ? [0, 0] : [Math.random() * 1.6 - 0.8, Math.random() * 0.8 - 0.4];
      nextGlance = t + 1.5 + Math.random() * 3;
    }
    autoGaze = autoGazeTarget;
    const [gx, gy] = look.gaze || autoGaze;

    // visage
    if (t > nextBlink) { blinkUntil = t + 0.13; nextBlink = t + 2 + Math.random() * 3; }
    const giggling = t < giggleUntil;
    const dizzy = t < dizzyUntil;
    const face = {
      eyes: dizzy ? "spiral" : giggling ? "arc" : look.eyes,
      brows: dizzy ? "sad" : giggling ? "none" : look.brows,
      mouth: dizzy ? "wavy" : giggling ? "laugh" : look.mouth,
      extras: giggling ? new Set([...look.extras, "blush"]) : look.extras,
      gazeX: Math.round(gx * 20) / 20, gazeY: Math.round(gy * 20) / 20,
      blink: t < blinkUntil, muscle: morphCur.muscle, dirt: morphCur.dirt,
    };
    const sig = [face.eyes, face.brows, face.mouth, [...face.extras].sort().join("+"), face.gazeX, face.gazeY,
      face.blink, Math.round(face.muscle * 20), Math.round(face.dirt * 20)].join("|");
    if (sig !== lastSig) { lastSig = sig; drawSkin(face); skinTex.needsUpdate = true; }

    poseGroup.position.y = CENTER + poseCur.dy - (contactRest - contactNow);
    bodyGroup.position.y = poseCur.lift;
    for (const { s, foot } of feet) {
      foot.position.set(0.42 * s, poseCur.footY, poseCur.footZ);
      foot.rotation.x = poseCur.footRX;
    }

    jigVel += (-180 * jig - 9 * jigVel) * dt;
    jig += jigVel * dt;

    const motion = look.motion;
    const breathe = dead || lying ? 0 : Math.sin(t * (motion === "snore" ? 1.3 : 2.4)) * (motion === "snore" ? 0.04 : 0.018);
    if (motion === "hop" && t > nextHop && !dead && look.posture === "stand") { hop(0.28); nextHop = t + 3.5 + Math.random() * 3; }
    let y = 0, sy = 1;
    const u = (t - hopStart) / 0.75;
    const hopping = u >= 0 && u < 1;
    if (hopping) {
      if (u < 0.2) sy = 1 - Math.sin((u / 0.2) * Math.PI) * 0.14;
      else {
        const v = (u - 0.2) / 0.8;
        y = Math.sin(v * Math.PI) * hopPower * 2.2;
        sy = 1 + Math.sin(v * Math.PI) * 0.08;
        if (u + dt / 0.75 >= 1) jigVel += 2.5;
      }
    }
    const sq = sy * (1 + breathe) * poseCur.squash - jig;
    const sxz = 1 / Math.sqrt(Math.max(0.5, sq));
    bodyGroup.scale.set(sxz, sq, sxz);

    let mx = 0, my = 0, mrz = 0, mry = 0;
    if (motion === "dance") { mrz = Math.sin(t * 4) * 0.14; my = Math.abs(Math.sin(t * 4)) * 0.18; mry = Math.sin(t * 2) * 0.35; }
    if (motion === "shake") mx = Math.sin(t * 45) * 0.025;
    if (motion === "sway") mrz = Math.sin(t * 1.1) * 0.08;
    if (motion === "snore") mrz = Math.sin(t * 0.65) * 0.03;
    char.position.set(mx, y + my, 0);
    char.rotation.z = approach(char.rotation.z, mrz, Math.min(1, dt * 6));
    char.rotation.y = approach(char.rotation.y, mry, Math.min(1, dt * 4));
    shadow.scale.setScalar(1 - Math.min(0.5, (y + my) * 0.6));

    const m = morphCur.muscle;
    const pose = ARMS[look.arms] || ARMS.rest;
    const flap = hopping ? Math.sin(u * Math.PI * 6) * 0.35 : 0;
    for (let i = 0; i < 2; i++) {
      const a = arms[i], tgt = pose[i], c = a.cur;
      c.a = approach(c.a, tgt.a, kp); c.x = approach(c.x, tgt.x, kp); c.e = approach(c.e, tgt.e, kp); c.f = approach(c.f, tgt.f, kp);
      const wave = tgt.wave ? Math.sin(t * 9) * 0.35 : 0;
      const droop = look.arms === "rest" ? morphCur.slump * 0.45 : 0;
      a.pivot.rotation.set(c.x, 0, a.s * (c.a - droop + flap + wave));
      a.upper.scale.set(1 + 0.4 * m, 1 + 0.3 * m, 1 + 0.4 * m);
      a.biceps.scale.setScalar(Math.max(0.001, m * (1.05 + (look.arms === "flex" ? (Math.sin(t * 4) * 0.5 + 0.5) * 0.15 : 0))));
      a.elbow.position.y = -0.36 - 0.06 * m;
      a.elbow.rotation.z = a.s * c.e;
      const f = Math.max(0.001, c.f) * (1 + 0.2 * m);
      a.fore.scale.setScalar(f); a.fist.scale.setScalar(f);
      a.fore.position.y = -0.14 * f; a.fist.position.y = -0.32 * f;
    }

    // rotation au doigt : élan, puis retour en douceur face à nous
    if (!dragging) {
      spinAngle += spinVel * dt;
      spinVel *= Math.exp(-dt * 2.2);
      if (Math.abs(spinVel) < 0.6 && t - releasedAt > 1.4) {
        // revient vers l'angle de repos (face à nous, ou celui choisi avec les flèches)
        const front = restAngle + Math.round((spinAngle - restAngle) / (Math.PI * 2)) * Math.PI * 2;
        spinAngle = approach(spinAngle, front, Math.min(1, dt * 2.5));
        spinVel *= 0.9;
      }
    }
    spin.rotation.y = spinAngle;
    if (dizzy) char.rotation.z += Math.sin(t * 7) * 0.006;
    world?.update(dt, t);

    const lag = hopping ? -Math.cos(u * Math.PI * 2) * 0.25 : 0;
    tuftGroup.rotation.z = -morphCur.slump * 0.95 + (dead ? 0 : Math.sin(t * 2.6) * 0.08) + lag + jig * 2;

    halo.visible = look.extras.has("halo");
    halo.rotation.z = t * 0.8;

    renderer.render(scene, camera);

    body.localToWorld(headPt.set(0, SY, 0));
    const [hx, hy] = project(headPt.clone().addScaledVector(UP, 0.75));
    bubble.style.left = clamp(hx, 90, container.clientWidth - 90) + "px";
    // la bulle ne monte pas plus haut que la zone libre (sinon elle passe sous l'interface)
    bubble.style.top = Math.max(framing?.minTop ?? 40, hy) + "px";
    bubble.classList.toggle("show", performance.now() < bubbleUntil);
    const [zx, zy] = project(headPt.clone().add(new THREE.Vector3(0.6, 0.3, 0)));
    zzz.style.left = zx + "px"; zzz.style.top = zy + "px";
    zzz.classList.toggle("show", look.extras.has("zzz"));
    const [cx2, cy2] = project(headPt.clone().add(new THREE.Vector3(-0.5, 0.2, 0)));
    heartsEl.style.left = cx2 + "px"; heartsEl.style.top = cy2 + "px";
    heartsEl.classList.toggle("show", look.extras.has("hearts"));
  }
  raf = requestAnimationFrame(frame);
  // ?debug : expose le moteur pour mesurer (appels de dessin, résolution)
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__creature3d = { renderer, get pixelRatio() { return pixelRatio; } };
  }

  return {
    setLook(next) {
      for (const ch of ["eyes", "brows", "mouth", "posture", "arms", "motion"]) if (next[ch]) look[ch] = next[ch];
      if (next.extras) look.extras = new Set(next.extras);
      look.gaze = next.gaze || null;
      if (next.morph) for (const key of MKEYS) morphTarget[key] = Math.round((next.morph[key] || 0) * 25) / 25;
    },
    hop,
    // cadrage voulu : ground = position du sol en pixels depuis le haut, size = hauteur de la créature en pixels
    setFrame(next) {
      framing = next;
      resize();
    },
    // tourne d'un quart de tour (flèches de l'écran)
    rotateBy(angle) {
      restAngle += angle;
      spinVel = 0;
      releasedAt = -10;
    },
    // photo de la scène, ciel compris (le ciel est dessiné en CSS derrière le canvas)
    snapshot({ top = "#2f9dff", bottom = "#b9e9ff", maxWidth = 900 } = {}) {
      renderer.render(scene, camera);
      const src = renderer.domElement;
      const ratio = Math.min(1, maxWidth / src.width);
      const out = document.createElement("canvas");
      out.width = Math.round(src.width * ratio);
      out.height = Math.round(src.height * ratio);
      const c = out.getContext("2d");
      const g = c.createLinearGradient(0, 0, 0, out.height);
      g.addColorStop(0, top); g.addColorStop(0.62, bottom); g.addColorStop(1, bottom);
      c.fillStyle = g; c.fillRect(0, 0, out.width, out.height);
      c.drawImage(src, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.86);
    },
    setScene({ phase = "day", dead = false } = {}) {
      world?.setPhase(phase, { dead });
      // la nuit, une petite lueur chaude garde le personnage bien orange
      const glow = phase === "night" && !dead ? 0.32 : phase === "dusk" ? 0.12 : 0;
      for (const mat of [bodyMat, limbMat]) { mat.emissive.set("#ff7a1a"); mat.emissiveIntensity = glow; }
    },
    blop() { if (poseCur.flop > 0.5) flopVel += 6; else jigVel += 5; },
    say,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", onUp);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) [].concat(o.material).forEach((mat) => { mat.map?.dispose(); mat.dispose(); });
      });
      skinTex.dispose(); gradientMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      bubble.remove(); zzz.remove(); heartsEl.remove();
    },
  };
}
