// lib/creature3d.js
// Le personnage en 3D (Three.js). Module autonome : il dessine la créature
// dans un conteneur et expose une petite API pour la piloter.
//
//   const creature = createCreature(container, { onPoke })
//   creature.setLook({ eyes, brows, mouth, extras, gaze, posture, arms, motion, morph })
//   creature.hop(0.3)   creature.blop()   creature.say("Miam !")   creature.dispose()
//   creature.say(text, ms?, prio?) -> false si ignorée (une seule bulle)   creature.isSpeaking()
//
// Points d'accroche pour les modules externes (vêtements, activités) :
//   creature.three              { THREE, scene, camera, renderer, char, spin, body, world, deformPoint }
//   creature.onFrame(fn)        fn(dt, t) à chaque image, renvoie la fonction de désinscription
//   creature.onReshape(fn)      fn() quand la forme du corps change (morphing, posture), idem
//   creature.anchor(slot)       THREE.Group attaché au corps : tete | yeux | cou | haut | dos
//   creature.setPuppet(p|null)  une activité prend la main (position, orientation, posture...)
//   creature.setPlaying(bool)   à la maison, vue studio (fond bleu, créature seule) ; true pendant une activité : la
//                               prairie revient (fondu bref). Sans effet si HOME_VIEW = "pre" dans world3d.js.
//   creature.isStudio()         true si la vue studio est active à la maison
//   creature.rotateBy(angle)    la fait pivoter (animé, doux) et elle garde ce nouvel angle de repos
//   creature.spinHold(dir)      rotation continue tant que dir vaut -1 (vers la gauche) ou 1 (vers la droite) ; 0 = relâche
//   creature.setTurnRing({ visible, pressed })  anneau de flèches en relief au sol autour d'elle (vue studio seulement)
//   creature.setCamera(c|null)  cadrage d'activité, transition douce ; null = cadrage normal
//   creature.setSkinOverlay(fn|null)  dessin par-dessus la peau (hauts peints), sous le visage
//   creature.setInputEnabled(bool)    coupe / rétablit le toucher (poke) et la rotation au doigt
//   creature.setAppearance(app|null)  apparence de lib/appearance.js (couleur, motif, forme, houppe,
//                                     oreilles) ; jamais appelée ou null = le look d'origine (orange)
//   creature.portrait({ size })       petit portrait (data URL, fond transparent) pour l'avatar
//
// Détails :
//   anchor(slot) : groupes enfants du corps, replacés à chaque changement de forme (placeAnchors) ;
//     userData = { slot, radius, depth, y, front?, eyeX?, eyeZ? } (demi-largeur/profondeur locales).
//     L'échelle du stade s'applique automatiquement (les ancres sont dans le corps).
//   setPuppet(p) : p = { x, y, z, yaw, posture, arms, motion, face:{eyes,brows,mouth,extras,gaze},
//     lockSpin, poke, snap }. Tant qu'une marionnette est posée : pas de rotation au doigt
//     (sauf lockSpin:false), pas de poke (sauf poke:true), spinAngle est ramené près de 0.
//     setPuppet(null) rend la main (retour doux vers l'angle de repos).
//   setCamera({ position:[x,y,z], target:[x,y,z], fov?, instant? } | null)
//   setSkinOverlay(fn) : fn(ctx, w, h, { uv }) appelée à chaque redessin de la peau, APRÈS le
//     fond (couleur, ventre, muscles) et AVANT la saleté et le visage (yeux, bouche, joues...),
//     qui restent donc toujours visibles par-dessus. Coordonnées pleine taille : w = 2048, h = 1024
//     (projection équirectangulaire, u = 0.25·w face avant). uv(px, py) -> [x, y] convertit un
//     point de la sphère unité vu de face (px horizontal, py vertical, -1..1) en pixels.
//     La bande de l'hémisphère bas correspond à y > h/2. Appeler à nouveau setSkinOverlay(fn)
//     force un redessin (ex. changement de couleur) ; null retire le dessin.
//   setInputEnabled(false) : les gestes sur le canvas sont ignorés (une activité capte le toucher) ;
//     penser à setInputEnabled(true) dans un finally.
//
// Zoom, position écran et gestes (tous optionnels) :
//   createCreature(c, { onPoke, onGround, onSpin, onSpeech, onScreen, onZoom, onGesture, world })
//     onPoke({ dead, asleep, x, y, r, top, bottom })  toucher bref sur la créature ; x,y = centre du corps
//       à l'écran (px relatifs au conteneur), r = rayon écran du corps, top = haut de la tête, bottom = pieds.
//       Le saut + gloussement sont immédiats ; l'appel est différé de 260 ms (annulé par un double-tap,
//       un pincement, setInputEnabled(false) ou dispose).
//     onScreen({ x, y, r, top, bottom, visible })  quand l'un des 5 nombres change de plus de 0.5 px
//     onZoom(z)       la cible de zoom change (arrondie à 0.01)
//     onGesture(kind) 'spin' | 'pinch' | 'wheel' | 'dbltap' (sert à fermer un menu autour de la créature)
//   creature.zoomBy(f)  multiplie la cible de zoom   creature.setZoom(z)   creature.getZoom() (cible)
//   creature.resetZoom()   creature.holdZoom(bool)  suspend le retour auto à 1 (6 s après le dernier geste)
//   creature.getScreenInfo()  copie de la dernière info écran   creature.isGesture()  pincement en cours
//     ou moins de 200 ms après un pincement / molette / double-tap
//   Zoom : pincement à deux doigts, molette (ctrl = pincement du pavé), double-tap / double-clic
//   (1 -> 1.7 -> 1). Plage 0.8 - 2.2 (élastique 0.7 - 2.5 pendant le geste). Remis à 1 pendant une
//   activité (setCamera / setPuppet). Rien n'est persisté.
//
// Voir CATALOG pour la liste des valeurs possibles de chaque canal.
import * as THREE from "three";
import { buildWorld, RENDER_STYLE, USE_STUDIO } from "./world3d.js";
import { pick, DIZZY } from "./dialogue.js";

export const CATALOG = {
  eyes: ["dot", "wide", "shiny", "arc", "closed", "tired", "flat", "squint", "x", "spiral", "heart", "star"],
  brows: ["none", "neutral", "raised", "angry", "sad", "evil", "skeptic"],
  mouth: ["smile", "content", "laugh", "grin", "flat", "smirk", "pout", "frown", "o", "open", "scream", "teeth", "evil", "tongue", "wavy", "kiss"],
  extras: ["blush", "tear", "tears", "sweat", "vein", "zzz", "hearts", "halo"],
  posture: ["stand", "sit", "crouch", "side", "back"],
  arms: ["rest", "hang", "up", "wave", "hug", "flex", "hips"],
  motion: ["calm", "hop", "dance", "shake", "sway", "snore", "run", "walk"],
};

const ORANGE = "#f8a33b";
const OUTLINE = "#5a2e14";
const MKEYS = ["belly", "muscle", "slump", "sick", "dirt", "dead"];

// ---------------------------------------------------------------------
// Apparence (lib/appearance.js) : couleurs dérivées de la couleur de base
// ---------------------------------------------------------------------
const hexToRgb = (hex) => {
  const n = parseInt(String(hex).replace("#", "").slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const rgbToHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(clampN(v, 0, 255)).toString(16).padStart(2, "0")).join("");
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return rgbToHex(f(0), f(8), f(4));
}
const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(...A.map((v, i) => v + (B[i] - v) * t)); };
function gradAt(stops, t) {
  const x = clampN(t, 0, 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
  return mixHex(stops[i], stops[i + 1], x - i);
}

// Palette de la peau : base, encre (contours, yeux), lueur du ventre, muscles, paupière, lueur de nuit.
// Sans apparence (ou l'orange d'origine uni) : exactement le look d'origine.
const DEFAULT_PAL = { base: ORANGE, ink: OUTLINE, belly: "255,200,110", muscle: "#c2621b", lid: ORANGE, glow: "#ff7a1a", sheen: 0, app: null };
function paletteFor(app) {
  if (!app || ((app.color || ORANGE).toLowerCase() === ORANGE && (!app.pattern || app.pattern === "uni"))) return { ...DEFAULT_PAL };
  const base = app.color || ORANGE;
  const [h, s, l] = rgbToHsl(hexToRgb(base));
  const eyeT = Math.acos(0.4) / Math.PI; // hauteur des yeux dans la texture
  return {
    base,
    ink: hslToHex(h, Math.min(0.62, s * 0.8 + 0.1), 0.2),
    belly: hexToRgb(mixHex(base, "#ffffff", 0.5)).join(","),
    muscle: hslToHex(h, s, l * 0.62),
    lid: app.gradient ? gradAt(app.gradient, eyeT) : base,
    glow: hslToHex(h, Math.min(1, s + 0.15), Math.min(0.6, l)),
    sheen: app.pattern === "brillant" || app.legend === "galaxie" ? 0.14 : 0,
    app,
  };
}

// Motif peint sur la peau (sous le visage). Zone du visage à épargner (pixels pleine taille).
const FACE_BOX = [210, 250, 814, 550];
const PATTERN_SPOTS = (() => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [];
  while (out.length < 18) {
    const x = rnd() * 2048, y = 150 + rnd() * 720, r = 34 + rnd() * 40;
    if (x + r > FACE_BOX[0] && x - r < FACE_BOX[2] && y + r > FACE_BOX[1] && y - r < FACE_BOX[3]) continue;
    out.push([x, y, r]);
  }
  return out;
})();
function paintPattern(ctx, pal) {
  const a = pal.app;
  if (!a) return;
  const W = 2048, H = 1024;
  const wrap = (x, fn) => { fn(x); if (x < 200) fn(x + W); if (x > W - 200) fn(x - W); };
  if (a.gradient) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    a.gradient.forEach((c, i) => g.addColorStop(i / (a.gradient.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (a.legend === "galaxie") {
      // petites étoiles, loin du visage
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      let seed = 5;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = 90 + rnd() * 820, r = 3 + rnd() * 6;
        if (x > FACE_BOX[0] - 10 && x < FACE_BOX[2] + 10 && y > FACE_BOX[1] - 10 && y < FACE_BOX[3] + 10) continue;
        const sx = 1 / Math.max(0.35, Math.sin((y / H) * Math.PI));
        wrap(x, (px) => { ctx.beginPath(); ctx.ellipse(px, y, r * sx, r, 0, 0, Math.PI * 2); ctx.fill(); });
      }
    }
  } else if (a.pattern === "bicolore" && a.color2) {
    // ventre / dessous d'une autre couleur, bord en douce vague (sous la bouche)
    ctx.fillStyle = a.color2;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 32) ctx.lineTo(x, 606 + Math.sin((x / W) * Math.PI * 12) * 12);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  } else if (a.pattern === "taches" && a.color2) {
    ctx.fillStyle = a.color2;
    for (const [x, y, r] of PATTERN_SPOTS) {
      const sx = 1 / Math.max(0.35, Math.sin((y / H) * Math.PI));
      wrap(x, (px) => { ctx.beginPath(); ctx.ellipse(px, y, r * sx, r, 0, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  if (a.pattern === "brillant" || a.legend === "galaxie") {
    // reflet sur le haut du crâne et petites étincelles
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.ellipse(380, 160, 110, 34, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(500, 150, 24, 14, 0, 0, Math.PI * 2); ctx.fill();
    for (const [x, y, r] of [[900, 330, 22], [1250, 260, 18], [1600, 420, 22], [140, 380, 18], [1900, 240, 16]]) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4, rr = i % 2 ? r * 0.3 : r;
        ctx.lineTo(x + Math.cos(ang) * rr * 1.3, y + Math.sin(ang) * rr);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

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

function makePainter(ctx, pal) {
  const ink = (w = 13) => {
    ctx.strokeStyle = pal.ink; ctx.fillStyle = pal.ink; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
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
          ctx.fillStyle = pal.lid; ctx.fillRect(cx - 40, cy - 46, 80, 44);
          line([[cx - 30, cy - 2], [cx + 30, cy - 2]]);
        }
        break;
      case "wide":
        ctx.fillStyle = "#fff"; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.ellipse(cx, cy, 33, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal.ink; ctx.beginPath(); ctx.ellipse(cx + gx * 13, cy + gy * 14, 14, 18, 0, 0, Math.PI * 2); ctx.fill();
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

  return function drawSkin(f, overlay) {
    ctx.fillStyle = pal.base; ctx.fillRect(0, 0, TEX_W, TEX_H);
    if (pal.app) { ctx.save(); paintPattern(ctx, pal); ctx.restore(); }
    const [bx, by] = uvp(0, -0.35);
    const g = ctx.createRadialGradient(bx, by, 10, bx, by, 300);
    g.addColorStop(0, `rgba(${pal.belly},0.55)`); g.addColorStop(1, `rgba(${pal.belly},0)`);
    ctx.fillStyle = g; ctx.fillRect(bx - 320, by - 320, 640, 640);

    if (f.muscle > 0.05) {
      ctx.save(); ctx.globalAlpha = Math.min(1, f.muscle * 1.2);
      ctx.strokeStyle = pal.muscle; ctx.lineCap = "round";
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
    if (overlay) {
      // hauts peints (t-shirt, marinière...) : sous la saleté et le visage
      ctx.save();
      try { overlay(ctx, TEX_W, TEX_H, { uv: uvp }); } catch (err) { console.error("[creature3d] overlay", err); }
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
  const S = P.shape;
  if (S) {
    // forme de l'apparence : proportions douces, le bas du corps reste posé au même endroit
    const k = S.w * (1 + S.top * clamp(py, 0, 1) + S.bot * clamp(-py, 0, 1));
    x *= k; z *= k;
    y = BOTTOM + (y - BOTTOM) * S.sy + S.peak * Math.pow(Math.max(0, py), 3);
  }
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

// Formes (appearance.body) ; rond = aucune modification
const BODY_SHAPES = {
  goutte: { w: 0.96, top: -0.1, bot: 0.03, sy: 1.04, peak: 0.16 },
  mochi: { w: 1.1, top: -0.02, bot: 0.05, sy: 0.88, peak: 0 },
  poire: { w: 0.98, top: -0.08, bot: 0.13, sy: 1.02, peak: 0 },
};

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
.c3d-bubble { position:absolute; transform:translate(-50%,-100%) scale(.85); background:#fff; color:#2b3440;
  border-radius:24px; padding:10px 18px; font:700 16px "Fredoka","Nunito",system-ui,sans-serif;
  box-shadow:0 8px 20px rgba(40,55,80,.2);
  width:max-content; max-width:min(260px, calc(100vw - 28px)); text-align:center; line-height:1.25; pointer-events:none; opacity:0; transition:opacity .25s, transform .3s cubic-bezier(.3,1.6,.5,1); z-index:2; }
.c3d-bubble::before, .c3d-bubble::after { content:""; position:absolute; background:#fff; border-radius:50%;
  box-shadow:0 3px 8px rgba(40,55,80,.18); }
.c3d-bubble::before { width:13px; height:13px; left:calc(50% - 22px); bottom:-15px; }
.c3d-bubble::after { width:7px; height:7px; left:calc(50% - 30px); bottom:-25px; }
.c3d-mark { display:none; position:absolute; width:42px; height:74px; margin:-37px 0 0 -21px; pointer-events:none; transition:opacity .3s; }
.c3d-mark svg { width:100%; height:100%; display:block; overflow:visible; animation:c3d-mark 3s ease-in-out infinite;
  filter:drop-shadow(0 0 8px var(--mk)) drop-shadow(0 4px 4px rgba(0,0,0,.15)); }
.c3d-think { position:absolute; width:100px; height:82px; pointer-events:none; opacity:0; transform:scale(.6);
  transform-origin:0 100%; transition:opacity .3s, transform .35s cubic-bezier(.3,1.6,.5,1); }
.c3d-think.show { opacity:1; transform:scale(1); }
.c3d-think > svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; filter:drop-shadow(0 5px 8px rgba(40,55,80,.2)); }
.c3d-think .ico { position:absolute; left:35px; top:21px; width:38px; height:34px; }
.c3d-think .ico svg { width:100%; height:100%; display:block; }
@keyframes c3d-mark { 0%,100% { transform:translateY(0) scaleX(1); } 50% { transform:translateY(-5px) scaleX(.82); } }
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
const SRGB_LUT = Uint8Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
});
const STAGE_SCALE = { oeuf: 0, bebe: 0.62, enfant: 0.8, ado: 0.92, adulte: 1 };

export const ANCHOR_SLOTS = ["tete", "yeux", "cou", "haut", "dos"];
const DEF_CAM_POS = new THREE.Vector3(0, 1.6, 8.6);
const DEF_CAM_TGT = new THREE.Vector3(0, 0.95, 0);

export function createCreature(container, { onPoke, onGround, onSpin, onSpeech, onScreen, onZoom, onGesture, world: withWorld = false } = {}) {
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
  // éclat d'humeur au-dessus de la tête, à la couleur de l'humeur
  const mark = overlay("c3d-mark", '<svg viewBox="0 0 32 56"><path d="M16 0Q18.6 21 29 28Q18.6 35 16 56Q13.4 35 3 28Q13.4 21 16 0z" fill="var(--mk)"/><path d="M16 0Q13.4 21 3 28L16 28z" fill="#fff" opacity=".45"/><path d="M16 56Q18.6 35 29 28L16 28z" fill="#000" opacity=".14"/><path d="M16 4Q15 20 8 27" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8" stroke-linecap="round"/></svg>');
  // nuage de pensée : ce dont elle a envie
  const think = overlay("c3d-think", '<svg viewBox="0 0 80 66"><g fill="#fff"><circle cx="5" cy="62" r="3.2"/><circle cx="13" cy="54" r="5"/><circle cx="28" cy="31" r="12"/><circle cx="42" cy="21" r="15"/><circle cx="58" cy="26" r="13"/><circle cx="66" cy="38" r="10"/><circle cx="52" cy="44" r="12"/><circle cx="35" cy="44" r="12"/><circle cx="23" cy="40" r="9"/></g></svg><div class="ico"></div>');
  const thinkIco = think.querySelector(".ico");
  let thinking = null;
  mark.style.setProperty("--mk", "#52c234");
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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !withWorld, powerPreference: "high-performance" });
  // Résolution plafonnée, puis ajustée selon la fluidité réelle de l'appareil
  // Netteté : on vise la vraie densité de l'écran (jusqu'à 2.5) et on ne descend jamais
  // sous un plancher qui garde l'image nette, même si le téléphone limite à 30 i/s.
  const maxRatio = Math.min(dpr, 2.5);
  const minRatio = Math.min(dpr, 1.5);
  let pixelRatio = Math.min(maxRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Rendu « doux » (voir RENDER_STYLE dans world3d.js) : seulement avec le décor ; le mode sans décor (alpha) reste inchangé.
  const DOUX = RENDER_STYLE === "doux" && withWorld;
  if (DOUX) {
    renderer.toneMapping = THREE.NeutralToneMapping; // garde les teintes pastel, n'écrase que les hautes lumières
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.copy(DEF_CAM_POS);
  camera.lookAt(DEF_CAM_TGT);

  const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0xb7774a, 1.35);
  scene.add(hemiLight);
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-2.5, 4, 5);
  scene.add(sun);
  // contre-jour de la vue studio : détache la silhouette (intensité réglée par world3d.js ; 0 dans la prairie)
  let rimLight = null;
  if (USE_STUDIO && withWorld) {
    rimLight = new THREE.DirectionalLight(0xd4e8ff, 0);
    rimLight.position.set(2.8, 3.4, -6);
    scene.add(rimLight);
  }
  if (DOUX) {
    // ombre portée du soleil (la caméra d'ombre est réglée dans world3d.js)
    sun.castShadow = true;
    const sm = dpr >= 2.5 ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
  }

  const gradientMap = new THREE.DataTexture(new Uint8Array([95, 190, 255]), 3, 1, THREE.RedFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  // Corps et membres : même plage de lumière, mais interpolée (LinearFilter) pour un ombrage
  // continu, sans les bandes nettes des paliers (elles traversaient le ventre en vue studio).
  const bodyGradient = new THREE.DataTexture(new Uint8Array([105, 165, 215, 245, 255]), 5, 1, THREE.RedFormat);
  bodyGradient.minFilter = bodyGradient.magFilter = THREE.LinearFilter;
  bodyGradient.needsUpdate = true;

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
  const outlineSmall = outlineMaterial(0.026); // décor (couleur fixe)
  const outlineLimb = outlineMaterial(0.026); // membres, houppe, oreilles (couleur de l'apparence)
  const withOutline = (mesh, mat = outlineLimb) => { mesh.add(new THREE.Mesh(mesh.geometry, mat)); return mesh; };

  // --- peau
  const skinCanvas = document.createElement("canvas");
  // peau en pleine résolution sur les écrans haute densité : visage net
  const SKIN_SCALE = dpr >= 2 ? 1 : 0.5;
  skinCanvas.width = TEX_W * SKIN_SCALE; skinCanvas.height = TEX_H * SKIN_SCALE;
  const skinCtx = skinCanvas.getContext("2d");
  // palette de l'apparence (setAppearance) ; par défaut, le look d'origine
  const pal = { ...DEFAULT_PAL };
  const paint = makePainter(skinCtx, pal);
  // on dessine en coordonnées pleine taille, réduites de moitié à l'écriture
  let skinOverlay = null;
  const drawSkin = (f) => { skinCtx.setTransform(SKIN_SCALE, 0, 0, SKIN_SCALE, 0, 0); paint(f, skinOverlay); };
  const skinTex = new THREE.CanvasTexture(skinCanvas);
  skinTex.colorSpace = THREE.SRGBColorSpace;
  skinTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // --- corps
  const bodyGeo = new THREE.SphereGeometry(1, 88, 66);
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

  const bodyMat = new THREE.MeshToonMaterial({ map: skinTex, gradientMap: bodyGradient });
  const limbMat = new THREE.MeshToonMaterial({ color: ORANGE, gradientMap: bodyGradient });
  // la créature garde exactement ses teintes d'avant : le tone mapping ne la touche pas
  if (DOUX) bodyMat.toneMapped = limbMat.toneMapped = false;

  let stageCur = 1, stageTarget = 1, stageSet = false;
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
    const foot = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 34), limbMat));
    foot.scale.set(1, 0.62, 1.15);
    inner.add(foot);
    feet.push({ s, foot });
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const upper = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.22, 12, 32), limbMat));
    upper.position.y = -0.17;
    pivot.add(upper);
    const biceps = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 28), limbMat));
    biceps.position.set(-s * 0.04, -0.2, 0.02);
    pivot.add(biceps);
    const elbow = new THREE.Group();
    elbow.position.y = -0.36;
    pivot.add(elbow);
    const fore = withOutline(new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.2, 12, 32), limbMat));
    elbow.add(fore);
    const fist = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 28), limbMat));
    elbow.add(fist);
    body.add(pivot);
    arms.push({ s, pivot, upper, biceps, elbow, fore, fist, cur: { ...ARMS.rest[0] } });
  }

  // houppe (variantes de l'apparence) : le groupe reste le même, seuls ses enfants changent
  // (cosmetics3d le cache sous les chapeaux en le retrouvant par son nom)
  const tuftGroup = new THREE.Group();
  tuftGroup.name = "tuft";
  const taperTube = (pts, radius, taper = 0.5, TS = 48, RS = 20) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, TS, radius, RS, false);
    const p = geo.attributes.position;
    for (let i = 0; i <= TS; i++) {
      const t = i / TS, c = curve.getPointAt(t), k = 1 - taper * t * t;
      for (let j = 0; j <= RS; j++) {
        const q = i * (RS + 1) + j;
        p.setXYZ(q, c.x + (p.getX(q) - c.x) * k, c.y + (p.getY(q) - c.y) * k, c.z + (p.getZ(q) - c.z) * k);
      }
    }
    geo.computeVertexNormals();
    return { geo, end: curve.getPointAt(1) };
  };
  const clearGroup = (g) => {
    for (const ch of [...g.children]) { g.remove(ch); ch.geometry?.dispose(); }
  };
  const ball = (r, at, parent) => {
    const m = withOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), limbMat));
    m.position.copy(at); parent.add(m); return m;
  };
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  function buildTuft(kind) {
    clearGroup(tuftGroup);
    if (kind === "aucune") return;
    if (kind === "boucle") {
      const { geo, end } = taperTube([V(0, -0.12), V(0, 0.12), V(0.03, 0.3), V(0.16, 0.4), V(0.27, 0.31), V(0.22, 0.19), V(0.12, 0.23)], 0.09, 0.55);
      tuftGroup.add(withOutline(new THREE.Mesh(geo, limbMat)));
      ball(0.045, end, tuftGroup);
    } else if (kind === "antennes") {
      for (const sd of [-1, 1]) {
        const { geo, end } = taperTube([V(0.06 * sd, -0.12), V(0.07 * sd, 0.12), V(0.13 * sd, 0.32), V(0.24 * sd, 0.46)], 0.04, 0.2, 24, 10);
        tuftGroup.add(withOutline(new THREE.Mesh(geo, limbMat)));
        ball(0.085, end, tuftGroup);
      }
    } else if (kind === "crete") {
      for (const [z, y, r] of [[0.2, 0.04, 0.12], [0, 0.1, 0.16], [-0.2, 0.04, 0.12]]) {
        const lobe = ball(r, V(0, y, z), tuftGroup);
        lobe.scale.set(0.6, 1.35, 1);
      }
    } else {
      // feuille (d'origine)
      const { geo, end } = taperTube([V(0, -0.12), V(0, 0.12), V(0.04, 0.3), V(0.16, 0.42), V(0.3, 0.43)], 0.1, 0.5, 40, 16);
      tuftGroup.add(withOutline(new THREE.Mesh(geo, limbMat)));
      ball(0.05, end, tuftGroup);
    }
  }
  buildTuft("feuille");
  tuftGroup.scale.setScalar(0.78);
  body.add(tuftGroup);

  // oreilles (rares) : groupe nommé, caché lui aussi sous les chapeaux
  const earsGroup = new THREE.Group();
  earsGroup.name = "ears";
  body.add(earsGroup);
  function buildEars(kind) {
    clearGroup(earsGroup);
    if (!kind) return;
    for (const sd of [-1, 1]) {
      let geo, dir, rz, scale = [1, 1, 1];
      if (kind === "pointues") {
        geo = new THREE.ConeGeometry(0.13, 0.34, 36, 4); geo.translate(0, 0.13, 0);
        dir = V(0.5 * sd, 0.84, 0.06); rz = -0.42 * sd; scale = [1, 1, 0.55];
      } else if (kind === "tombantes") {
        geo = new THREE.CapsuleGeometry(0.11, 0.26, 10, 28); geo.translate(0, -0.2, 0);
        dir = V(0.62 * sd, 0.76, 0.02); rz = 1.05 * sd; scale = [1, 1, 0.55];
      } else {
        geo = new THREE.SphereGeometry(0.17, 40, 28);
        dir = V(0.52 * sd, 0.82, 0.04); rz = -0.45 * sd; scale = [1, 1, 0.5];
      }
      const ear = withOutline(new THREE.Mesh(geo, limbMat));
      ear.scale.set(...scale);
      ear.rotation.z = rz;
      ear.userData = { dir: dir.normalize(), rz, s: sd };
      earsGroup.add(ear);
    }
  }

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.05, 16, 72),
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
  if (DOUX) shadow.material.opacity = 0.5; // l'ombre portée réelle prend le relais : on garde une ombre de contact douce
  scene.add(shadow);

  // Flèches « tourner » de la vue studio : deux arcs en relief posés au sol qui forment ensemble un cercle
  // autour de la créature (les pointes se rejoignent devant, l'arrière passe derrière elle).
  // Purement visuelles : les zones tactiles sont les boutons de components/RotateArrows.vue.
  // Angles : 90° = derrière, 270° = devant (vers la caméra), 180° = à gauche.
  // bandBase / bandEnd : épaisseur de la bande à la base puis juste avant la pointe (elle s'affine) ;
  // hit : demi-largeur de la zone de toucher invisible autour de chaque flèche (unités du monde)
  const TURN = { r: 2.25, bandBase: 0.22, bandEnd: 0.07, head: 0.26, headW: 0.22, hit: 0.5, opacity: 0.88, pressed: 1 };
  const turnRing = new THREE.Group();
  const turnMats = [];
  const turnHits = []; // zones de toucher invisibles ; userData.turnSign = sens de rotation (1 / -1)
  {
    const deg = Math.PI / 180;
    const { r: R, bandBase: WB, bandEnd: WE, head: HEAD, headW: HW } = TURN;
    const arrow = (a0, a1, turnSign) => {
      const dir = Math.sign(a1 - a0), N = 56, pts = [];
      const at = (rad, a) => new THREE.Vector2(rad * Math.cos(a), rad * Math.sin(a));
      const half = (i) => (WB + ((WE - WB) * i) / N) / 2; // demi-épaisseur : large à la base, fine vers la pointe
      for (let i = 0; i <= N; i++) pts.push(at(R + half(i), a0 + ((a1 - a0) * i) / N));
      pts.push(at(R + HW, a1), at(R, a1 + (dir * HEAD) / R), at(R - HW, a1));
      for (let i = N; i >= 0; i--) pts.push(at(R - half(i), a0 + ((a1 - a0) * i) / N));
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
        depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 2, curveSegments: 1,
      });
      geo.rotateX(-Math.PI / 2); // forme (x, y) -> sol (x, -z), épaisseur vers le haut
      const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, metalness: 0, transparent: true, opacity: TURN.opacity });
      turnMats.push(mat);
      // zone de toucher : secteur d'anneau au sol, bien plus large que la flèche, jamais dessiné
      const headAng = HEAD / R + 8 * deg;
      const lo = Math.min(a0 - dir * 6 * deg, a1 + dir * headAng), len = Math.abs(a1 - a0) + headAng + 6 * deg;
      const hitGeo = new THREE.RingGeometry(R - TURN.hit, R + TURN.hit, 1, 1, lo, len);
      hitGeo.rotateX(-Math.PI / 2);
      const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }));
      hit.userData.turnSign = turnSign;
      turnHits.push(hit);
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat), hit);
      return g;
    };
    // gauche (sens +) et droite (sens −), sur les côtés, légèrement vers l'avant, pointes vers l'avant
    turnRing.add(arrow(172 * deg, 232 * deg, 1), arrow(8 * deg, -52 * deg, -1));
  }
  turnRing.position.y = 0.025;
  turnRing.visible = false;
  scene.add(turnRing);

  const world = withWorld
    ? buildWorld(scene, { gradientMap, outline: outlineSmall, shadowTexture: shadow.material.map, hemi: hemiLight, sun, rim: rimLight, contact: shadow })
    : null;

  // --- points d'accroche (vêtements, accessoires) : enfants du corps, ils suivent
  // ses déformations, sa respiration, sa posture et l'échelle du stade.
  // userData : radius (demi-largeur du corps à cette hauteur), depth (demi-profondeur),
  // y (hauteur locale), et pour les yeux eyeX (écart d'un œil au centre).
  const anchors = {};
  for (const slot of ANCHOR_SLOTS) {
    const g = new THREE.Group();
    g.name = `anchor-${slot}`;
    g.userData = { slot, radius: 1, depth: 1, y: 0 };
    body.add(g);
    anchors[slot] = g;
  }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
  // Section horizontale du corps à la hauteur py (sur la sphère unité) : centre, demi-largeur, demi-profondeur
  function section(py, P, out) {
    const r = Math.sqrt(Math.max(0, 1 - py * py));
    deformFull(-r, py, 0, P, _a); deformFull(r, py, 0, P, _b);
    deformFull(0, py, r, P, _c); deformFull(0, py, -r, P, _d);
    out.center.set((_a.x + _b.x) / 2, (_a.y + _b.y + _c.y + _d.y) / 4, (_c.z + _d.z) / 2);
    out.radius = (_b.x - _a.x) / 2; out.depth = (_c.z - _d.z) / 2; out.front = _c.z; out.back = _d.z;
    return out;
  }
  const sec = { center: new THREE.Vector3(), radius: 1, depth: 1, front: 1, back: -1 };

  function placeAnchors(P) {
    const A = anchors;
    // tête : sommet du crâne
    deformFull(0, 1, 0, P, tmp);
    A.tete.position.copy(tmp);
    section(0.72, P, sec);
    Object.assign(A.tete.userData, { radius: sec.radius, depth: sec.depth, y: tmp.y });
    // yeux : devant le visage, à hauteur des yeux
    section(0.4, P, sec);
    deformFull(0, 0.4, Math.sqrt(1 - 0.16), P, tmp);
    A.yeux.position.copy(tmp);
    deformFull(0.34, 0.4, Math.sqrt(1 - 0.34 * 0.34 - 0.16), P, _a);
    Object.assign(A.yeux.userData, { radius: sec.radius, depth: sec.depth, y: tmp.y, eyeX: _a.x, eyeZ: _a.z - tmp.z });
    // cou : sous la bouche, sur l'axe du corps (pour une écharpe en anneau)
    section(-0.12, P, sec);
    A.cou.position.copy(sec.center);
    Object.assign(A.cou.userData, { radius: sec.radius, depth: sec.depth, y: sec.center.y, front: sec.front - sec.center.z });
    // haut : centre du torse (bas du corps), sur l'axe
    section(-0.4, P, sec);
    A.haut.position.copy(sec.center);
    Object.assign(A.haut.userData, { radius: sec.radius, depth: sec.depth, y: sec.center.y, front: sec.front - sec.center.z });
    // dos : derrière, à mi-hauteur
    section(-0.08, P, sec);
    A.dos.position.set(sec.center.x, sec.center.y, sec.back);
    Object.assign(A.dos.userData, { radius: sec.radius, depth: sec.depth, y: sec.center.y });
  }

  let topY = SY;
  function placeAttachments(P) {
    for (const a of arms) {
      const d = new THREE.Vector3(a.s * 0.93, -0.1, 0.22).normalize();
      deformFull(d.x, d.y, d.z, P, tmp);
      a.pivot.position.set(tmp.x * 0.9, tmp.y, tmp.z * 0.9);
    }
    deformFull(0, 1, 0, P, tmp);
    tuftGroup.position.copy(tmp);
    halo.position.set(0, tmp.y + 0.45, 0);
    topY = tmp.y;
    for (const ear of earsGroup.children) {
      const d = ear.userData.dir;
      deformFull(d.x, d.y, d.z, P, tmp);
      ear.position.copy(tmp).multiplyScalar(0.96);
    }
    placeAnchors(P);
  }

  // --- modules externes : rappels par image et changements de forme
  const frameFns = new Set();
  const reshapeFns = new Set();
  const runFns = (set, ...args) => {
    for (const fn of set) {
      try { fn(...args); } catch (err) { console.error("[creature3d]", err); set.delete(fn); }
    }
  };

  // --- marionnette : une activité prend la main
  // p = { x, y, z, yaw, posture, arms, motion, face: { eyes, brows, mouth, extras, gaze }, lockSpin, poke, snap }
  let puppet = null, puppetExtras = null;
  const puppetPos = new THREE.Vector3();
  let runLean = 0;

  // --- caméra : cadrage normal (calculé par resize) ou imposé par une activité
  const camPos = DEF_CAM_POS.clone(), camTgt = DEF_CAM_TGT.clone();
  let camFov = 30, camOff = 0, normalFov = 30, normalOff = 0, viewW = 1, viewH = 1;
  let camGoal = null, camMoving = false;
  const normCam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  // zoom utilisateur : vrai zoom de focale autour du cadrage normal
  const ZOOM_MIN = 0.8, ZOOM_MAX = 2.2, ZOOM_SOFT_MIN = 0.7, ZOOM_SOFT_MAX = 2.5;
  let zoom = 1, zoomGoal = 1, lastZoomAt = 0, holdZ = false, zoomSent = 1;
  const reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let frameAspect = 1, frameH = 1, frameGround = 0;
  const zoomFrame = { fov: 30, off: 0 };
  const g0Vec = new THREE.Vector3();
  const clampSoft = (z) => THREE.MathUtils.clamp(z, ZOOM_SOFT_MIN, ZOOM_SOFT_MAX);
  const clampFinal = (z) => THREE.MathUtils.clamp(z, ZOOM_MIN, ZOOM_MAX);
  // cadrage (fov, décalage vertical) pour un zoom z ; ne touche à aucun état de la vraie caméra
  function normalFrameFor(z) {
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(normalFov) / 2) / z));
    normCam.aspect = frameAspect; normCam.fov = fov;
    normCam.position.copy(DEF_CAM_POS); normCam.lookAt(DEF_CAM_TGT);
    normCam.updateProjectionMatrix(); normCam.updateMatrixWorld();
    g0Vec.set(0, 0, 0).project(normCam);
    const groundNow = (-g0Vec.y * 0.5 + 0.5) * frameH;
    let wanted = frameGround;
    if (z > 1) {
      const anchorY = framing?.center ?? frameH * 0.62;
      wanted = frameGround + (anchorY - frameGround) * THREE.MathUtils.clamp((z - 1) / 1.2, 0, 1);
    }
    zoomFrame.fov = fov; zoomFrame.off = groundNow - wanted;
    return zoomFrame;
  }
  function applyCam() {
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    camera.fov = camFov;
    if (Math.abs(camOff) > 0.01) camera.setViewOffset(viewW, viewH, 0, camOff, viewW, viewH);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  // --- interaction
  // Une seule bulle à la fois. prio : 0 bavardage, 1 réaction (défaut), 2 réplique précise (goûts, messages).
  // Pendant qu'une réplique s'affiche : même texte ou priorité plus basse = ignoré ; priorité égale
  // dans les 400 ms = doublon du même instant, ignoré. onSpeech(ms) : la bulle s'affiche pour ms.
  let bubbleText = "", bubblePrio = 0, bubbleAt = 0;
  const say = (text, ms = 2600, prio = 1) => {
    if (!text) return false;
    const now = performance.now();
    if (now < bubbleUntil && (text === bubbleText || prio < bubblePrio || (prio === bubblePrio && now - bubbleAt < 400))) return false;
    bubble.textContent = text;
    bubbleText = text; bubblePrio = prio; bubbleAt = now;
    bubbleUntil = now + ms;
    onSpeech?.(ms);
    return true;
  };
  const isSpeaking = () => performance.now() < bubbleUntil;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null, giggleUntil = 0, dizzyUntil = 0;
  // Faire tourner : glisser à l'horizontale, avec de l'élan au lâcher
  let dragging = false, lastX = 0, lastT = 0, spinAngle = 0, spinVel = 0, releasedAt = -10, restAngle = 0;
  let holdDir = 0, restEase = 2.5; // rotation maintenue (flèches) ; vitesse de retour vers l'angle de repos
  const HOLD_SPEED = 2.6; // rad/s en rotation maintenue
  let inputEnabled = true;
  // --- zoom : pincement, molette, double-tap
  const pts = new Map();
  let pinch0 = null, ignoreUntilUp = false, gestureAt = -1e9, downTime = 0, lastTap = null;
  let pokeTimer = 0, wheelTimer = 0, hopLift = 0;
  const markGesture = (kind) => { gestureAt = performance.now(); lastZoomAt = gestureAt; onGesture?.(kind); };
  const cancelPoke = () => { if (pokeTimer) { clearTimeout(pokeTimer); pokeTimer = 0; } };
  const isGesture = () => !!pinch0 || performance.now() - gestureAt < 200;
  const zoomAllowed = () => inputEnabled && !camGoal && !puppet;
  // position écran du corps (px relatifs au conteneur) ; vecteurs préalloués
  const scrCenter = new THREE.Vector3(), scrEdge = new THREE.Vector3(), scrRight = new THREE.Vector3(), scrFoot = new THREE.Vector3();
  const scrTop = new THREE.Vector3(), scrNdc = new THREE.Vector3();
  const scrBuf = [0, 0, 0, 0, 0, 0, 0, 0];
  const toPx = (v, i) => {
    scrNdc.copy(v).project(camera);
    scrBuf[i] = (scrNdc.x * 0.5 + 0.5) * container.clientWidth;
    scrBuf[i + 1] = (-scrNdc.y * 0.5 + 0.5) * container.clientHeight;
  };
  function computeScreen(out) {
    camera.updateMatrixWorld();
    body.localToWorld(scrCenter.set(0, topY * 0.5, 0));
    scrCenter.y -= hopLift; // retire le saut : le menu ne tremble pas
    toPx(scrCenter, 0);
    scrRight.setFromMatrixColumn(camera.matrixWorld, 0);
    scrEdge.copy(scrCenter).addScaledVector(scrRight, 0.55 * stageCur);
    toPx(scrEdge, 2);
    body.localToWorld(scrTop.set(0, topY, 0));
    scrTop.y -= hopLift;
    toPx(scrTop, 4);
    scrFoot.set(char.position.x, char.position.y - hopLift, char.position.z);
    toPx(scrFoot, 6);
    const w = container.clientWidth, h = container.clientHeight;
    out.x = scrBuf[0]; out.y = scrBuf[1];
    out.r = Math.hypot(scrBuf[2] - scrBuf[0], scrBuf[3] - scrBuf[1]);
    out.top = scrBuf[5]; out.bottom = scrBuf[7];
    out.visible = char.visible && stageCur > 0.3 && out.x > 0 && out.x < w && out.y > 0 && out.y < h;
    return out;
  }
  const lastScreen = { x: 0, y: 0, r: 0, top: 0, bottom: 0, visible: false };
  const curScreen = { x: 0, y: 0, r: 0, top: 0, bottom: 0, visible: false };
  let screenSent = false;
  function emitScreen() {
    if (!onScreen) return;
    const c = computeScreen(curScreen), l = lastScreen;
    const moved = Math.abs(c.x - l.x) > 0.5 || Math.abs(c.y - l.y) > 0.5 || Math.abs(c.r - l.r) > 0.5
      || Math.abs(c.top - l.top) > 0.5 || Math.abs(c.bottom - l.bottom) > 0.5;
    if (screenSent && !moved && c.visible === l.visible) return;
    Object.assign(l, c); screenSent = true;
    onScreen({ ...c });
  }
  // --- flèches « tourner » de la vue studio : on les touche directement dans la scène 3D.
  // Toucher bref = quart de tour ; appui maintenu (> 260 ms) = rotation continue jusqu'au lâcher.
  let turnPress = 0, turnHeld = false, turnTimer = 0;
  const setTurnPressed = (sign) => {
    turnMats[0].opacity = sign === 1 ? TURN.pressed : TURN.opacity;
    turnMats[1].opacity = sign === -1 ? TURN.pressed : TURN.opacity;
  };
  const hitTurnRing = (e) => {
    if (!turnRing.visible || puppet) return 0;
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(turnHits, false)[0];
    return hit ? hit.object.userData.turnSign : 0;
  };
  const startTurn = (sign) => {
    turnPress = sign; turnHeld = false;
    setTurnPressed(sign);
    clearTimeout(turnTimer);
    turnTimer = setTimeout(() => {
      if (turnPress !== sign) return;
      turnHeld = true;
      holdDir = sign; spinVel = 0; restEase = 2.5; // rotation continue
    }, 260);
  };
  const endTurn = (apply) => {
    clearTimeout(turnTimer);
    const sign = turnPress;
    turnPress = 0;
    if (turnHeld) { holdDir = 0; restAngle = spinAngle; } // on garde l'angle où on lâche
    else if (apply && sign) { restAngle += (sign * Math.PI) / 2; restEase = 5.5; spinVel = 0; releasedAt = -10; } // quart de tour
    turnHeld = false;
    setTurnPressed(0);
    if (apply && sign) onSpin?.();
  };

  const onDown = (e) => {
    if (!inputEnabled) { downAt = null; dragging = false; return; }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    renderer.domElement.setPointerCapture?.(e.pointerId);
    if (pts.size === 1) {
      const sign = hitTurnRing(e);
      if (sign) { startTurn(sign); downAt = null; dragging = false; return; }
    }
    if (turnPress) endTurn(false); // un 2e doigt pendant l'appui : on annule la flèche
    if (pts.size === 2 && zoomAllowed()) {
      const [a, b] = [...pts.values()];
      pinch0 = { d: Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), z: zoomGoal };
      downAt = null; dragging = false; spinVel = 0; lastTap = null;
      cancelPoke();
      markGesture("pinch");
      return;
    }
    if (pts.size > 1) { downAt = null; dragging = false; return; }
    ignoreUntilUp = false;
    downAt = [e.clientX, e.clientY];
    downTime = performance.now();
    lastX = e.clientX; lastT = downTime;
    dragging = false;
  };
  const onMove = (e) => {
    const p = pts.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (pinch0) {
      if (pts.size >= 2 && zoomAllowed()) {
        const [a, b] = [...pts.values()];
        zoomGoal = clampSoft(pinch0.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch0.d);
        lastZoomAt = performance.now();
      }
      return;
    }
    if (!downAt || !inputEnabled || ignoreUntilUp) return;
    if (puppet && puppet.lockSpin !== false) return; // une activité a la main : pas de rotation au doigt
    if (!dragging && Math.abs(e.clientX - downAt[0]) > 8) { dragging = true; onGesture?.("spin"); }
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
    pts.delete(e.pointerId);
    if (turnPress) { endTurn(e.type !== "pointercancel"); downAt = null; dragging = false; return; }
    if (pinch0) {
      if (pts.size < 2) {
        pinch0 = null;
        zoomGoal = clampFinal(zoomGoal);
        lastZoomAt = gestureAt = performance.now();
        ignoreUntilUp = pts.size > 0;
        downAt = null; dragging = false;
      }
      return;
    }
    if (ignoreUntilUp) { if (!pts.size) ignoreUntilUp = false; downAt = null; dragging = false; return; }
    const wasDragging = dragging;
    dragging = false;
    if (!downAt) return;
    const start = downAt;
    downAt = null;
    if (!inputEnabled) return;
    if (wasDragging) {
      if (performance.now() - lastT > 80) spinVel = 0; // doigt arrêté avant le lâcher
      releasedAt = clock.elapsedTime; restEase = 2.5;
      onSpin?.();
      if (Math.abs(spinVel) > 11 && morphCur.dead < 0.5) {
        dizzyUntil = clock.elapsedTime + 2.6;
        say(pick(DIZZY));
      }
      return;
    }
    if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) return;
    const now = performance.now();
    if (now - downTime > 350) return; // appui long : ni poke ni double-tap
    if (zoomAllowed()) {
      // double-tap / double-clic : zoom (même sur le décor)
      if (lastTap && now - lastTap.t < 280 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24) {
        lastTap = null;
        cancelPoke();
        zoomGoal = zoomGoal > 1.35 ? 1 : 1.7;
        markGesture("dbltap");
        return;
      }
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    if (puppet && !puppet.poke) return; // pendant une activité, les touchers sont pour le mini-jeu
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
    if (onPoke) {
      cancelPoke();
      pokeTimer = setTimeout(() => {
        pokeTimer = 0;
        onPoke({ dead, asleep, ...computeScreen({}) });
      }, 260);
    }
  };
  const resetPointers = () => {
    pts.clear();
    if (pinch0) { pinch0 = null; zoomGoal = clampFinal(zoomGoal); }
    ignoreUntilUp = false; downAt = null; dragging = false;
  };
  const onVisibility = () => { if (document.hidden) resetPointers(); };
  const onWheel = (e) => {
    if (!zoomAllowed()) return;
    e.preventDefault();
    zoomGoal = clampSoft(zoomGoal * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    cancelPoke();
    markGesture("wheel");
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelTimer = 0; zoomGoal = clampFinal(zoomGoal); }, 150);
  };
  const onGestureStart = (e) => e.preventDefault();
  const cv = renderer.domElement;
  cv.style.touchAction = "none";
  cv.style.cursor = "grab";
  cv.style.userSelect = "none";
  cv.style.webkitUserSelect = "none";
  cv.style.webkitTouchCallout = "none";
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", resetPointers);
  cv.addEventListener("wheel", onWheel, { passive: false });
  cv.addEventListener("gesturestart", onGestureStart);
  window.addEventListener("blur", resetPointers);
  document.addEventListener("visibilitychange", onVisibility);

  // --- animation
  const clock = new THREE.Clock();
  let jig = 0, jigVel = 0, flopJig = 0, flopVel = 0;
  let hopStart = -10, hopPower = 0, nextHop = 3;
  let nextBlink = 2, blinkUntil = 0;
  let autoGaze = [0, 0], autoGazeTarget = [0, 0], nextGlance = 2;
  let lastSig = "", lastMorphSig = "", bubbleUntil = 0;
  const poseCur = { ...POSTURES.stand };
  const downLocal = new THREE.Vector3(0, -1, 0), invQ = new THREE.Quaternion();
  // teintes malade / sans forces : multipliées à la couleur de base (quelle qu'elle soit)
  const tint = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1),
    SICK = new THREE.Color(0.55, 0.95, 0.42), DEAD = new THREE.Color(0.5, 0.5, 0.53), BASE = new THREE.Color(ORANGE);
  let sceneGlow = 0;
  const applyGlow = () => {
    for (const mat of [bodyMat, limbMat]) { mat.emissive.set(pal.glow); mat.emissiveIntensity = sceneGlow + pal.sheen; }
  };
  let appKey = "null";
  let portraitRT = null;
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
    normalFov = THREE.MathUtils.radToDeg(2 * Math.atan(halfH));
    // le décalage se calcule avec la caméra du cadrage normal (même si une activité a déplacé la vraie)
    const groundWanted = framing?.ground ?? h * (aspect < 0.9 ? 0.78 : 0.84);
    frameAspect = aspect; frameH = h; frameGround = groundWanted;
    normalOff = normalFrameFor(1).off;
    viewW = w; viewH = h;
    // le zoom en cours est conservé (adaptQuality rappelle resize en plein pincement)
    if (!camGoal && !camMoving) { const zf = normalFrameFor(zoom); camFov = zf.fov; camOff = zf.off; }
    if (!camMoving) applyCam();
    // le halo du fond studio se centre sur la créature (environ la moitié de sa hauteur au-dessus des pieds)
    world?.setFocus?.(0.5, THREE.MathUtils.clamp((groundWanted - (framing?.size ?? h * 0.4) * 0.5) / h, 0.2, 0.8));
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
  let playingView = false, viewTimer = 0;
  let perfAcc = 0, perfFrames = 0, perfLast = performance.now();
  function adaptQuality() {
    const now = performance.now();
    perfAcc += now - perfLast; perfLast = now; perfFrames++;
    if (perfFrames < 45) return;
    const avg = perfAcc / perfFrames;
    perfAcc = 0; perfFrames = 0;
    // trop lent : on baisse la résolution ; très fluide : on la remonte
    const next = avg > 28 ? Math.max(minRatio, pixelRatio - 0.15) : avg < 18 ? Math.min(maxRatio, pixelRatio + 0.15) : pixelRatio;
    if (next !== pixelRatio) { pixelRatio = next; renderer.setPixelRatio(pixelRatio); resize(); }
  }
  let shadowScan = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    adaptQuality();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    // la créature (corps, membres, oreilles, houppe, vêtements) projette une ombre ; relevé toutes les 0,7 s
    // car les membres et les vêtements sont recréés à la volée. Les contours (ShaderMaterial) ne projettent rien.
    if (DOUX && (shadowScan -= dt) <= 0) {
      shadowScan = 0.7;
      char.traverse((o) => { if (o.isMesh && o.material?.isMeshToonMaterial) o.castShadow = true; });
    }
    const k = Math.min(1, dt * 5);
    const kp = Math.min(1, dt * 4);

    // canaux effectifs : la marionnette (activité) passe avant l'humeur
    const curPosture = puppet?.posture || look.posture;
    const curArms = puppet?.arms || look.arms;
    const curMotion = puppet?.motion || look.motion;
    const pf = puppet?.face;
    const curExtras = puppetExtras || look.extras;

    // zoom utilisateur : seulement au cadrage normal, hors activité
    const zoomOn = !camGoal && !puppet;
    if (!zoomOn) zoomGoal = 1;
    else if (!holdZ && !pinch0 && zoomGoal !== 1 && performance.now() - lastZoomAt > 6000) zoomGoal = 1;
    const zRound = Math.round(zoomGoal * 100) / 100;
    if (zRound !== zoomSent) { zoomSent = zRound; onZoom?.(zRound); }
    const zoomMoving = Math.abs(zoomGoal - zoom) > 0.0005;
    if (zoomMoving) {
      const kz = reducedMotion ? 1 - Math.exp(-dt * 40) : 1 - Math.exp(-dt * 10);
      zoom += (zoomGoal - zoom) * kz;
      if (Math.abs(zoomGoal - zoom) <= 0.0005) zoom = zoomGoal;
    }
    // caméra : transition douce vers le cadrage voulu
    if (camMoving) {
      const kc = 1 - Math.exp(-dt * 3.2);
      const gp = camGoal ? camGoal.pos : DEF_CAM_POS, gt = camGoal ? camGoal.tgt : DEF_CAM_TGT;
      const zf = normalFrameFor(zoom);
      const gf = camGoal?.fov ?? zf.fov, go = camGoal ? 0 : zf.off;
      camPos.lerp(gp, kc); camTgt.lerp(gt, kc);
      camFov += (gf - camFov) * kc; camOff += (go - camOff) * kc;
      if (camPos.distanceToSquared(gp) < 1e-6 && camTgt.distanceToSquared(gt) < 1e-6 && Math.abs(camFov - gf) < 0.01 && Math.abs(camOff - go) < 0.3) {
        camPos.copy(gp); camTgt.copy(gt); camFov = gf; camOff = go; camMoving = false;
      }
      applyCam();
    } else if (zoomMoving) {
      const zf = normalFrameFor(zoom);
      camFov = zf.fov; camOff = zf.off;
      applyCam();
    }

    // posture
    const P = POSTURES[curPosture] || POSTURES.stand;
    const prevFlop = poseCur.flop;
    for (const key in poseCur) poseCur[key] = approach(poseCur[key], P[key], kp);
    runLean = approach(runLean, curMotion === "run" ? 0.16 : curMotion === "walk" ? 0.05 : 0, kp);
    poseGroup.rotation.set(poseCur.rx + runLean, 0, poseCur.rz);
    downLocal.set(0, -1, 0).applyQuaternion(invQ.copy(poseGroup.quaternion).invert());
    if (P.flop > 0.5 && prevFlop < 0.75 && poseCur.flop >= 0.75) flopVel += 7;
    if (P.flop < 0.5 && prevFlop > 0.6 && poseCur.flop <= 0.6) flopVel -= 4;
    flopVel += (-140 * flopJig - 7 * flopVel) * dt;
    flopJig += flopVel * dt;
    const lying = poseCur.flop > 0.5;
    const dead = morphCur.dead > 0.5;
    const flopBreath = lying && !dead ? Math.round(Math.sin(t * (curMotion === "snore" ? 1.3 : 2.2)) * 4) * 0.02 : 0;

    // morphing
    for (const key of MKEYS) {
      morphCur[key] = approach(morphCur[key], morphTarget[key], k);
      if (Math.abs(morphCur[key] - morphTarget[key]) < 0.004) morphCur[key] = morphTarget[key];
    }
    morphCur.down = downLocal;
    morphCur.flop = Math.round(clamp(poseCur.flop + flopJig + flopBreath, 0, 1.5) * 100) / 100;
    const morphSig = MKEYS.map((key) => morphCur[key].toFixed(3)).join() + morphCur.flop.toFixed(3) +
      downLocal.x.toFixed(2) + downLocal.y.toFixed(2) + downLocal.z.toFixed(2);
    if (morphSig !== lastMorphSig) {
      lastMorphSig = morphSig; rebuildBody(morphCur); placeAttachments(morphCur);
      if (reshapeFns.size) runFns(reshapeFns);
    }
    tint.copy(WHITE).lerp(SICK, morphCur.sick).lerp(DEAD, morphCur.dead);
    bodyMat.color.copy(tint);
    limbMat.color.copy(BASE).multiply(tint);

    // regard : imposé, ou petits coups d'œil spontanés
    if (t > nextGlance) {
      autoGazeTarget = Math.random() < 0.4 ? [0, 0] : [Math.random() * 1.6 - 0.8, Math.random() * 0.8 - 0.4];
      nextGlance = t + 1.5 + Math.random() * 3;
    }
    autoGaze = autoGazeTarget;
    const [gx, gy] = pf?.gaze || look.gaze || autoGaze;

    // visage
    if (t > nextBlink) { blinkUntil = t + 0.13; nextBlink = t + 2 + Math.random() * 3; }
    const giggling = t < giggleUntil;
    const dizzy = t < dizzyUntil;
    const face = {
      eyes: dizzy ? "spiral" : giggling ? "arc" : pf?.eyes || look.eyes,
      brows: dizzy ? "sad" : giggling ? "none" : pf?.brows || look.brows,
      mouth: dizzy ? "wavy" : giggling ? "laugh" : pf?.mouth || look.mouth,
      extras: giggling ? new Set([...curExtras, "blush"]) : curExtras,
      gazeX: Math.round(gx * 20) / 20, gazeY: Math.round(gy * 20) / 20,
      blink: t < blinkUntil, muscle: morphCur.muscle, dirt: morphCur.dirt,
    };
    const sig = [face.eyes, face.brows, face.mouth, [...face.extras].sort().join("+"), face.gazeX, face.gazeY,
      face.blink, Math.round(face.muscle * 20), Math.round(face.dirt * 20)].join("|");
    if (sig !== lastSig) { lastSig = sig; drawSkin(face); skinTex.needsUpdate = true; }

    poseGroup.position.y = CENTER + poseCur.dy - (contactRest - contactNow);
    bodyGroup.position.y = poseCur.lift;
    const stride = curMotion === "run" ? 14 : curMotion === "walk" ? 7 : 0;
    for (const { s, foot } of feet) {
      foot.position.set(0.42 * s, poseCur.footY, poseCur.footZ);
      foot.rotation.x = poseCur.footRX;
      if (stride) {
        // pas de course / de marche : les pieds avancent et se lèvent chacun leur tour
        const ph = t * stride + (s > 0 ? Math.PI : 0), amp = stride > 10 ? 0.2 : 0.12;
        foot.position.z += Math.sin(ph) * amp;
        foot.position.y += Math.max(0, Math.cos(ph)) * amp * 0.6;
        foot.rotation.x += Math.sin(ph) * 0.3;
      }
    }

    jigVel += (-180 * jig - 9 * jigVel) * dt;
    jig += jigVel * dt;

    const motion = curMotion;
    const breathe = dead || lying ? 0 : Math.sin(t * (motion === "snore" ? 1.3 : 2.4)) * (motion === "snore" ? 0.04 : 0.018);
    if (motion === "hop" && !puppet && t > nextHop && !dead && curPosture === "stand") { hop(0.28); nextHop = t + 3.5 + Math.random() * 3; }
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
    hopLift = y;
    const sq = sy * (1 + breathe) * poseCur.squash - jig;
    const sxz = 1 / Math.sqrt(Math.max(0.5, sq));
    bodyGroup.scale.set(sxz, sq, sxz);

    let mx = 0, my = 0, mrz = 0, mry = 0;
    if (motion === "dance") { mrz = Math.sin(t * 4) * 0.14; my = Math.abs(Math.sin(t * 4)) * 0.18; mry = Math.sin(t * 2) * 0.35; }
    if (motion === "shake") mx = Math.sin(t * 45) * 0.025;
    if (motion === "sway") mrz = Math.sin(t * 1.1) * 0.08;
    if (motion === "snore") mrz = Math.sin(t * 0.65) * 0.03;
    if (motion === "run") { my = Math.abs(Math.sin(t * 14)) * 0.12; mrz = Math.sin(t * 14) * 0.04; }
    if (motion === "walk") { my = Math.abs(Math.sin(t * 7)) * 0.05; mrz = Math.sin(t * 7) * 0.03; }
    // position imposée par une activité (sinon 0 : le personnage reste au centre)
    if (puppet) {
      const kq = puppet.snap ? 1 : Math.min(1, dt * 8);
      puppetPos.x = approach(puppetPos.x, puppet.x || 0, kq);
      puppetPos.y = approach(puppetPos.y, puppet.y || 0, kq);
      puppetPos.z = approach(puppetPos.z, puppet.z || 0, kq);
    } else if (puppetPos.x || puppetPos.y || puppetPos.z) {
      const kq = Math.min(1, dt * 6);
      puppetPos.set(approach(puppetPos.x, 0, kq), approach(puppetPos.y, 0, kq), approach(puppetPos.z, 0, kq));
      if (puppetPos.lengthSq() < 1e-6) puppetPos.set(0, 0, 0);
    }
    char.position.set(mx + puppetPos.x, y + my + puppetPos.y, puppetPos.z);
    shadow.position.x = puppetPos.x; shadow.position.z = puppetPos.z;
    stageCur = approach(stageCur, stageTarget, Math.min(1, dt * 3));
    char.scale.setScalar(Math.max(0.001, stageCur));
    char.visible = stageCur > 0.02;
    char.rotation.z = approach(char.rotation.z, mrz, Math.min(1, dt * 6));
    char.rotation.y = approach(char.rotation.y, mry, Math.min(1, dt * 4));
    shadow.scale.setScalar(1 - Math.min(0.5, (y + my + Math.max(0, puppetPos.y)) * 0.6));
    // l'anneau suit la créature : sa position au sol (comme l'ombre) et sa taille (stade)
    if (turnRing.visible) { turnRing.position.x = shadow.position.x; turnRing.position.z = shadow.position.z; turnRing.scale.setScalar(Math.max(0.6, stageCur)); }

    const m = morphCur.muscle;
    const pose = ARMS[curArms] || ARMS.rest;
    const flap = hopping ? Math.sin(u * Math.PI * 6) * 0.35 : 0;
    for (let i = 0; i < 2; i++) {
      const a = arms[i], tgt = pose[i], c = a.cur;
      c.a = approach(c.a, tgt.a, kp); c.x = approach(c.x, tgt.x, kp); c.e = approach(c.e, tgt.e, kp); c.f = approach(c.f, tgt.f, kp);
      const wave = tgt.wave ? Math.sin(t * 9) * 0.35 : 0;
      const droop = curArms === "rest" ? morphCur.slump * 0.45 : 0;
      const swing = stride ? Math.sin(t * stride + (a.s > 0 ? 0 : Math.PI)) * (stride > 10 ? 0.7 : 0.4) : 0;
      a.pivot.rotation.set(c.x + swing, 0, a.s * (c.a - droop + flap + wave));
      a.upper.scale.set(1 + 0.4 * m, 1 + 0.3 * m, 1 + 0.4 * m);
      a.biceps.scale.setScalar(Math.max(0.001, m * (1.05 + (curArms === "flex" ? (Math.sin(t * 4) * 0.5 + 0.5) * 0.15 : 0))));
      a.elbow.position.y = -0.36 - 0.06 * m;
      a.elbow.rotation.z = a.s * c.e;
      const f = Math.max(0.001, c.f) * (1 + 0.2 * m);
      a.fore.scale.setScalar(f); a.fist.scale.setScalar(f);
      a.fore.position.y = -0.14 * f; a.fist.position.y = -0.32 * f;
    }

    // rotation au doigt : élan, puis retour en douceur face à nous
    if (puppet) {
      // orientation imposée par l'activité
      const goal = puppet.yaw || 0;
      spinAngle = puppet.snap ? goal : approach(spinAngle, goal, Math.min(1, dt * 8));
      spinVel = 0;
    } else if (!dragging && holdDir) {
      // rotation maintenue : elle tourne à vitesse constante et garde l'angle où on la lâche
      spinAngle += holdDir * HOLD_SPEED * dt;
      spinVel = 0; releasedAt = t; restAngle = spinAngle;
    } else if (!dragging) {
      spinAngle += spinVel * dt;
      spinVel *= Math.exp(-dt * 2.2);
      if (Math.abs(spinVel) < 0.6 && t - releasedAt > 1.4) {
        // revient vers l'angle de repos (face à nous, ou celui choisi avec les flèches)
        const front = restAngle + Math.round((spinAngle - restAngle) / (Math.PI * 2)) * Math.PI * 2;
        spinAngle = approach(spinAngle, front, Math.min(1, dt * restEase));
        spinVel *= 0.9;
      }
    }
    spin.rotation.y = spinAngle;
    if (dizzy) char.rotation.z += Math.sin(t * 7) * 0.006;
    world?.update(dt, t);
    if (frameFns.size) runFns(frameFns, dt, t);

    const lag = hopping ? -Math.cos(u * Math.PI * 2) * 0.25 : 0;
    tuftGroup.rotation.z = -morphCur.slump * 0.95 + (dead ? 0 : Math.sin(t * 2.6) * 0.08) + lag + jig * 2;
    for (const ear of earsGroup.children) {
      const { rz, s: es } = ear.userData;
      ear.rotation.z = rz + es * (jig * 1.2 + lag * 0.25 - morphCur.slump * 0.25) + (dead ? 0 : Math.sin(t * 2.2 + es) * 0.03);
    }

    halo.visible = curExtras.has("halo");
    halo.rotation.z = t * 0.8;

    renderer.render(scene, camera);
    emitScreen();

    body.localToWorld(headPt.set(0, topY, 0));
    const [hx, hy] = project(headPt.clone().addScaledVector(UP, 1.75));
    const [kx, ky] = project(headPt.clone().addScaledVector(UP, 1.15));
    mark.style.left = kx + "px"; mark.style.top = ky + "px";
    mark.style.opacity = dead ? 0 : 1;
    const [tx, ty] = project(headPt.clone().add(new THREE.Vector3(0.45, 0.3, 0)));
    think.style.left = Math.min(tx + 4, container.clientWidth - 104) + "px";
    think.style.top = Math.max(framing?.minTop ?? 40, ty - 82) + "px";
    think.classList.toggle("show", !!thinking && !dead && performance.now() >= bubbleUntil);
    // la bulle reste entière dans l'écran (marge de 14 px, comme l'interface)
    const half = Math.max(90, bubble.offsetWidth / 2 + 14);
    bubble.style.left = clamp(hx + 46, half, container.clientWidth - half) + "px";
    // la bulle ne monte pas plus haut que la zone libre (sinon elle passe sous l'interface)
    bubble.style.top = Math.max(framing?.minTop ?? 40, hy) + "px";
    bubble.classList.toggle("show", performance.now() < bubbleUntil);
    const [zx, zy] = project(headPt.clone().add(new THREE.Vector3(0.6, 0.3, 0)));
    zzz.style.left = zx + "px"; zzz.style.top = zy + "px";
    zzz.classList.toggle("show", curExtras.has("zzz"));
    const [cx2, cy2] = project(headPt.clone().add(new THREE.Vector3(-0.5, 0.2, 0)));
    heartsEl.style.left = cx2 + "px"; heartsEl.style.top = cy2 + "px";
    heartsEl.classList.toggle("show", curExtras.has("hearts"));
  }
  raf = requestAnimationFrame(frame);
  // ?debug : expose le moteur pour mesurer (appels de dessin, résolution)
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__creature3d = { renderer, get pixelRatio() { return pixelRatio; } };
  }

  const deformPoint = (px, py, pz, out = new THREE.Vector3()) =>
    (morphCur.down ? deformFull(px, py, pz, morphCur, out) : deform(px, py, pz, morphCur, out));

  return {
    // accès brut pour les modules externes (vêtements, activités)
    three: { THREE, scene, camera, renderer, char, spin, body, world, deformPoint },
    // fn(dt, t) appelée à chaque image (avant le rendu) ; renvoie la désinscription
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    // fn() appelée quand la forme du corps change (morphing, posture couchée...)
    onReshape(fn) { reshapeFns.add(fn); return () => reshapeFns.delete(fn); },
    // groupe attaché au corps pour un emplacement de vêtement
    anchor(slot) { return anchors[slot] || null; },
    // une activité prend la main ; null rend le comportement normal
    setPuppet(p) {
      if (p) {
        const first = !puppet;
        puppet = { ...p };
        puppetExtras = p.face?.extras ? new Set(p.face.extras) : null;
        if (first) {
          // plus de rotation au doigt ni de poke en cours ; angle ramené au tour le plus proche de 0
          dragging = false; downAt = null; spinVel = 0;
          zoomGoal = 1; cancelPoke();
          spinAngle -= Math.round(spinAngle / (Math.PI * 2)) * Math.PI * 2;
          giggleUntil = 0; dizzyUntil = 0;
        }
        if (p.snap) { puppetPos.set(p.x || 0, p.y || 0, p.z || 0); }
      } else if (puppet) {
        puppet = null; puppetExtras = null;
        // retour en douceur vers l'angle de repos
        spinVel = 0; releasedAt = -10;
        spinAngle -= Math.round((spinAngle - restAngle) / (Math.PI * 2)) * Math.PI * 2;
      }
    },
    // dessin par-dessus la peau, sous le visage (voir l'en-tête) ; null = aucun
    setSkinOverlay(fn) {
      skinOverlay = typeof fn === "function" ? fn : null;
      lastSig = ""; // redessin à la prochaine image
    },
    // coupe (false) ou rétablit (true) le poke et la rotation au doigt
    setInputEnabled(on) {
      inputEnabled = on !== false;
      if (!inputEnabled) { downAt = null; dragging = false; spinVel = 0; cancelPoke(); resetPointers(); }
      renderer.domElement.style.cursor = inputEnabled ? "grab" : "default";
    },
    // cadrage d'activité { position:[x,y,z], target:[x,y,z], fov?, instant? } ; null = cadrage normal
    setCamera(cfg) {
      if (cfg) {
        camGoal = {
          pos: new THREE.Vector3().fromArray(cfg.position || DEF_CAM_POS.toArray()),
          tgt: new THREE.Vector3().fromArray(cfg.target || DEF_CAM_TGT.toArray()),
          fov: cfg.fov ?? null,
        };
        if (camGoal.fov == null) camGoal.fov = normalFov;
        zoom = zoomGoal = 1;
      } else {
        if (!camGoal) return;
        camGoal = null;
      }
      camMoving = true;
      if (cfg?.instant) {
        const gp = camGoal ? camGoal.pos : DEF_CAM_POS, gt = camGoal ? camGoal.tgt : DEF_CAM_TGT;
        camPos.copy(gp); camTgt.copy(gt); camFov = camGoal ? camGoal.fov : normalFov; camOff = camGoal ? 0 : normalOff;
        camMoving = false; applyCam();
      }
    },
    // stade de croissance : bébé tout petit, adulte à taille pleine, oeuf = invisible (l'oeuf est dessiné en CSS)
    setStage(key) {
      const v = STAGE_SCALE[key] ?? 1;
      if (!stageSet) { stageCur = v; stageSet = true; } // premier appel : pas d'animation
      stageTarget = v;
    },
    setLook(next) {
      for (const ch of ["eyes", "brows", "mouth", "posture", "arms", "motion"]) if (next[ch]) look[ch] = next[ch];
      if (next.extras) look.extras = new Set(next.extras);
      look.gaze = next.gaze || null;
      if (next.mark) mark.style.setProperty("--mk", next.mark);
      if ("thought" in next && next.thought !== thinking) {
        thinking = next.thought;
        thinkIco.innerHTML = thinking || "";
      }
      if (next.morph) for (const key of MKEYS) morphTarget[key] = Math.round((next.morph[key] || 0) * 25) / 25;
    },
    hop,
    // zoom utilisateur (voir l'en-tête)
    zoomBy(f) { zoomGoal = clampFinal(zoomGoal * f); lastZoomAt = performance.now(); },
    setZoom(z) { zoomGoal = clampFinal(+z || 1); lastZoomAt = performance.now(); },
    getZoom() { return zoomGoal; },
    resetZoom() { zoomGoal = 1; },
    holdZoom(on) { holdZ = !!on; lastZoomAt = performance.now(); },
    getScreenInfo() { return { ...computeScreen({}) }; },
    isGesture,
    // cadrage voulu : ground = position du sol en pixels depuis le haut, size = hauteur de la créature en pixels
    setFrame(next) {
      framing = next;
      resize();
    },
    // tourne d'un quart de tour (flèches de l'écran)
    rotateBy(angle) {
      restAngle += angle;
      restEase = Math.abs(angle) <= Math.PI ? 5.5 : 2.5; // un quart de tour est vif, un tour entier plus lent
      spinVel = 0;
      releasedAt = -10;
    },
    // rotation continue (appui maintenu sur une flèche) : dir -1 = vers la gauche, 1 = vers la droite, 0 = on lâche
    spinHold(dir) {
      const d = Math.sign(dir) || 0;
      if (d && (puppet || !inputEnabled)) return;
      holdDir = d;
      if (d) { spinVel = 0; restEase = 2.5; } else restAngle = spinAngle;
    },
    isStudio() { return !!(world && USE_STUDIO); },
    // anneau de flèches au sol (vue studio) : visible ou non ; pressed = -1 (gauche) / 1 (droite) allume la flèche
    setTurnRing({ visible = false, pressed = 0 } = {}) {
      turnRing.visible = !!visible && !!(world && USE_STUDIO);
      turnMats[0].opacity = pressed === -1 ? TURN.pressed : TURN.opacity;
      turnMats[1].opacity = pressed === 1 ? TURN.pressed : TURN.opacity;
    },
    // vue d'accueil (studio) ou activité en cours (prairie) ; bascule avec un bref fondu du canvas
    setPlaying(on) {
      on = !!on;
      if (on === playingView) return;
      playingView = on;
      if (!world || !USE_STUDIO) return;
      const el = renderer.domElement;
      clearTimeout(viewTimer);
      if (reducedMotion) { world.setView(on ? "pre" : "studio"); return; }
      el.style.transition = "opacity .16s ease";
      el.style.opacity = "0";
      viewTimer = setTimeout(() => {
        world.setView(playingView ? "pre" : "studio");
        el.style.opacity = "1";
        viewTimer = setTimeout(() => { el.style.transition = ""; el.style.opacity = ""; }, 220);
      }, 170);
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
    setScene({ phase = "day", dead = false, sky = null, theme = null } = {}) {
      world?.setTheme(theme);
      world?.setPhase(phase, { dead, sky });
      // la nuit, une petite lueur chaude garde le personnage bien orange
      sceneGlow = phase === "night" && !dead ? 0.32 : phase === "dusk" ? 0.12 : 0;
      applyGlow();
    },
    // Apparence (lib/appearance.js) : couleur, motif, forme, houppe, oreilles. null = look d'origine.
    setAppearance(app) {
      const a = app && typeof app === "object" ? app : null;
      const key = JSON.stringify(a ? [a.color, a.color2, a.pattern, a.gradient, a.legend, a.body, a.tuft, a.ears] : null);
      if (key === appKey) return;
      appKey = key;
      Object.assign(pal, paletteFor(a));
      BASE.set(pal.base);
      outlineBody.uniforms.color.value.set(pal.ink);
      outlineLimb.uniforms.color.value.set(pal.ink);
      applyGlow();
      buildTuft(a?.tuft || "feuille");
      buildEars(a?.ears || null);
      morphCur.shape = BODY_SHAPES[a?.body] || null;
      lastMorphSig = ""; lastSig = ""; // forme et peau refaites à la prochaine image
    },
    // Petit portrait (data URL, fond transparent) : la créature de face, visage souriant, lumière
    // de jour, sans le décor. null si elle n'est pas visible (œuf).
    portrait({ size = 160 } = {}) {
      if (!char.visible || stageCur < 0.05) return null;
      const S = size * 2; // rendu 2x puis réduit : bords lissés
      if (!portraitRT || portraitRT.width !== S) { portraitRT?.dispose(); portraitRT = new THREE.WebGLRenderTarget(S, S); }
      const vis = scene.children.map((o) => o.visible);
      scene.children.forEach((o) => { o.visible = o === char || !!o.isLight; });
      const bg = scene.background, fog = scene.fog;
      scene.background = null; scene.fog = null;
      const rimI = rimLight ? rimLight.intensity : 0;
      if (rimLight) rimLight.intensity = 0;
      const hemiS = [hemiLight.color.clone(), hemiLight.groundColor.clone(), hemiLight.intensity];
      const sunS = [sun.color.clone(), sun.intensity];
      hemiLight.color.set(0xfff1dc); hemiLight.groundColor.set(0xb7774a); hemiLight.intensity = 1.35;
      sun.color.set(0xffffff); sun.intensity = 2.1;
      const glowS = sceneGlow; sceneGlow = 0; applyGlow();
      const colS = [bodyMat.color.clone(), limbMat.color.clone()];
      bodyMat.color.copy(WHITE); limbMat.color.copy(BASE); // sans teinte malade : le portrait reste joyeux
      const rot = [spin.rotation.y, char.rotation.y, char.rotation.z];
      spin.rotation.y = 0; char.rotation.y = 0; char.rotation.z = 0;
      drawSkin({ eyes: "dot", brows: "none", mouth: "smile", extras: new Set(["blush"]), gazeX: 0, gazeY: 0, blink: false, muscle: morphCur.muscle, dirt: 0 });
      skinTex.needsUpdate = true;
      scene.updateMatrixWorld(true);
      const top = body.localToWorld(new THREE.Vector3(0, topY, 0));
      const foot = char.getWorldPosition(new THREE.Vector3());
      const h = Math.max(0.3, top.y - foot.y);
      const tgt = new THREE.Vector3(top.x, foot.y + h * 0.56, top.z);
      const pc = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const dist = (h * 0.6) / Math.tan(THREE.MathUtils.degToRad(15));
      pc.position.set(tgt.x, tgt.y + h * 0.12, tgt.z + dist);
      pc.lookAt(tgt);
      const prevRT = renderer.getRenderTarget();
      const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
      const px = new Uint8Array(S * S * 4);
      try {
        renderer.setRenderTarget(portraitRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(scene, pc);
        renderer.readRenderTargetPixels(portraitRT, 0, 0, S, S, px);
      } finally {
        renderer.setRenderTarget(prevRT);
        renderer.setClearColor(cc, ca);
        scene.children.forEach((o, i) => { o.visible = vis[i]; });
        scene.background = bg; scene.fog = fog;
        hemiLight.color.copy(hemiS[0]); hemiLight.groundColor.copy(hemiS[1]); hemiLight.intensity = hemiS[2];
        sun.color.copy(sunS[0]); sun.intensity = sunS[1];
        if (rimLight) rimLight.intensity = rimI;
        sceneGlow = glowS; applyGlow();
        bodyMat.color.copy(colS[0]); limbMat.color.copy(colS[1]);
        [spin.rotation.y, char.rotation.y, char.rotation.z] = rot;
        lastSig = ""; // le vrai visage revient à la prochaine image
      }
      // la cible de rendu est en linéaire : conversion sRGB + retournement vertical
      const big = document.createElement("canvas");
      big.width = big.height = S;
      const bctx = big.getContext("2d");
      const img = bctx.createImageData(S, S);
      const row = S * 4;
      for (let y = 0; y < S; y++) {
        const src = (S - 1 - y) * row, dst = y * row;
        for (let i = 0; i < row; i += 4) {
          img.data[dst + i] = SRGB_LUT[px[src + i]];
          img.data[dst + i + 1] = SRGB_LUT[px[src + i + 1]];
          img.data[dst + i + 2] = SRGB_LUT[px[src + i + 2]];
          img.data[dst + i + 3] = px[src + i + 3];
        }
      }
      bctx.putImageData(img, 0, 0);
      const out = document.createElement("canvas");
      out.width = out.height = size;
      const octx = out.getContext("2d");
      octx.imageSmoothingQuality = "high";
      octx.drawImage(big, 0, 0, size, size);
      const webp = out.toDataURL("image/webp", 0.9);
      return webp.startsWith("data:image/webp") ? webp : out.toDataURL("image/png");
    },
    blop() { if (poseCur.flop > 0.5) flopVel += 6; else jigVel += 5; },
    say,
    isSpeaking,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      frameFns.clear(); reshapeFns.clear();
      cancelPoke(); clearTimeout(wheelTimer); clearTimeout(viewTimer);
      window.removeEventListener("blur", resetPointers);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointercancel", resetPointers);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("gesturestart", onGestureStart);
      scene.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) [].concat(o.material).forEach((mat) => { mat.map?.dispose(); mat.dispose(); });
      });
      skinTex.dispose(); gradientMap.dispose(); bodyGradient.dispose(); portraitRT?.dispose();
      turnRing.traverse((o) => { o.geometry?.dispose(); if (o.material && !turnMats.includes(o.material)) o.material.dispose(); });
      turnMats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      bubble.remove(); mark.remove(); think.remove(); zzz.remove(); heartsEl.remove();
    },
  };
}
