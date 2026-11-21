// lib/cosmetics3d.js
// Vêtements et accessoires de la créature (Three.js), posés dans les ancres de creature3d.
//
//   applyOutfit(creature, outfit)            tenue portée ({ tete, yeux, cou, haut, dos } -> { id, color } | null)
//   const restore = previewOutfit(creature, outfit)   essayage temporaire (fusionné avec la tenue portée) ;
//                                            restore() revient à la tenue portée
//   endPreview(creature)                     fin de tout essayage en cours
//   disposeOutfit(creature)                  retire et libère tout (à appeler avant creature.dispose)
//
// Principes :
// - Les hauts « paint:true » (t-shirt, marinière, maillot, pull de Noël, sweat) sont PEINTS dans la
//   texture de peau via creature.setSkinOverlay : ils épousent toutes les déformations du corps.
//   Seuls le tutu (anneau) et la capuche du sweat sont en 3D.
// - Chaque objet rigide = UNE géométrie fusionnée (couleurs par sommet) + son contour : 2 appels de
//   dessin par emplacement, soit 10 au maximum pour une tenue complète (budget : 12).
// - Matériaux partagés par créature : toon à couleurs de sommet, « or » (toon clair + léger émissif),
//   « galaxie » (une seule texture canvas partagée par tout le module, peau comprise).
// - Taille : les ancres sont dans le corps, l'échelle du stade (bébé... adulte) s'applique seule ;
//   à chaque changement de forme (onReshape), chaque objet se recale sur la largeur du corps.
// - Aucune allocation par image : une seule fonction onFrame (ballon, ailes, cape, reflets galaxie),
//   inscrite seulement si un objet animé est porté.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COLORS, SLOTS, itemById } from "./catalog.js";

const OUTLINE = "#5a2e14";
const WHITE = "#f7f5ef";
const INK = "#2c2c35";
const PINK = "#ffb3c7";
const LENS = "#1f2633";
const STRING = "#e9e4da";

// ---------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function shade(hex, amt) {
  _c1.set(hex);
  _c2.set(amt < 0 ? "#000000" : "#ffffff");
  _c1.lerp(_c2, Math.abs(amt));
  return `#${_c1.getHexString()}`;
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
// main : couleur de l'objet ; dark / light : nuances ; ink : couleur lisible posée dessus
function palette(colorKey) {
  const c = COLORS[colorKey] || COLORS.rouge;
  if (c.key === "or") return { key: "or", hex: c.hex, hex2: c.hex2, main: "#ffcc33", dark: "#c9921a", light: "#fff1a8", ink: "#7a5300", premium: "or" };
  if (c.key === "galaxie") return { key: "galaxie", hex: c.hex, hex2: c.hex2, main: "#ffffff", dark: "#a996ff", light: "#ffffff", ink: "#ffffff", premium: "galaxie" };
  const lum = luminance(c.hex);
  return {
    key: c.key, hex: c.hex, main: c.hex,
    dark: shade(c.hex, lum < 0.25 ? 0.18 : -0.24),
    light: shade(c.hex, lum > 0.85 ? -0.12 : 0.35),
    ink: lum > 0.62 ? INK : WHITE,
    premium: null,
  };
}

// ---------------------------------------------------------------------
// Ressources partagées par tout le module (texture galaxie, palier toon)
// ---------------------------------------------------------------------
let galaxyCanvas = null, galaxyTex = null, gradientMap = null;
function getGalaxyCanvas() {
  if (galaxyCanvas) return galaxyCanvas;
  const S = 256;
  galaxyCanvas = document.createElement("canvas");
  galaxyCanvas.width = galaxyCanvas.height = S;
  const g = galaxyCanvas.getContext("2d");
  g.fillStyle = "#24164f"; g.fillRect(0, 0, S, S);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // nébuleuses (dessinées en 3x3 pour que la texture se répète sans couture)
  const blobs = [["#b06bff", 0.5], ["#5b3fd6", 0.55], ["#ff6bd0", 0.35], ["#4fb6ff", 0.3], ["#b06bff", 0.4]];
  for (const [col, a] of blobs) {
    const x = rnd() * S, y = rnd() * S, r = 50 + rnd() * 70;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const gr = g.createRadialGradient(x + ox * S, y + oy * S, 0, x + ox * S, y + oy * S, r);
      _c1.set(col);
      const rgb = `${Math.round(_c1.r * 255)},${Math.round(_c1.g * 255)},${Math.round(_c1.b * 255)}`;
      gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(x + ox * S - r, y + oy * S - r, r * 2, r * 2);
    }
  }
  // étoiles
  for (let i = 0; i < 70; i++) {
    const x = rnd() * S, y = rnd() * S, r = rnd() < 0.85 ? 0.8 + rnd() * 1.2 : 2.2;
    g.fillStyle = `rgba(255,255,255,${0.6 + rnd() * 0.4})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (r > 2) { g.fillRect(x - 5, y - 0.6, 10, 1.2); g.fillRect(x - 0.6, y - 5, 1.2, 10); }
  }
  return galaxyCanvas;
}
function getGalaxyTex() {
  if (!galaxyTex) {
    galaxyTex = new THREE.CanvasTexture(getGalaxyCanvas());
    galaxyTex.colorSpace = THREE.SRGBColorSpace;
    galaxyTex.wrapS = galaxyTex.wrapT = THREE.RepeatWrapping;
    galaxyTex.repeat.set(2, 2);
  }
  return galaxyTex;
}
function getGradientMap() {
  if (!gradientMap) {
    gradientMap = new THREE.DataTexture(new Uint8Array([95, 190, 255]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

function makeMaterials() {
  const gm = getGradientMap();
  return {
    base: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gm }),
    or: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gm, emissive: "#6b4a00", emissiveIntensity: 0.45 }),
    galaxie: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gm, map: getGalaxyTex(), emissive: "#2a1660", emissiveIntensity: 0.55 }),
    // contour « dessin animé » : coque agrandie le long de normales lissées (onormal), faces arrière
    outline: new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(OUTLINE) }, thickness: { value: 0.022 } },
      vertexShader: `
        uniform float thickness;
        attribute vec3 onormal;
        void main() {
          vec3 p = position + normalize(onormal) * thickness;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 color;
        void main() {
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
    }),
  };
}

// ---------------------------------------------------------------------
// Construction des géométries : pièces colorées fusionnées en une seule
// ---------------------------------------------------------------------
const KEEP = new Set(["position", "normal", "uv"]);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// geo : géométrie three ; color : hex ; t = { p:[x,y,z], r:[x,y,z], s: n | [x,y,z] }
function part(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  for (const k of Object.keys(g.attributes)) if (!KEEP.has(k)) g.deleteAttribute(k);
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  _e.set(r[0], r[1], r[2]);
  _q.setFromEuler(_e);
  if (typeof s === "number") _s.setScalar(s); else _s.set(s[0], s[1], s[2]);
  _m.compose(_p.set(p[0], p[1], p[2]), _q, _s);
  g.applyMatrix4(_m);
  _c1.set(color);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c1.r; col[i * 3 + 1] = _c1.g; col[i * 3 + 2] = _c1.b; }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.morphAttributes = {};
  return g;
}

// normales lissées par position (pour un contour sans fissure aux arêtes)
function addOutlineNormals(geo) {
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array;
  const acc = new Map();
  const keys = new Array(pos.length / 3);
  for (let i = 0; i < keys.length; i++) {
    const k = `${Math.round(pos[i * 3] * 1e3)},${Math.round(pos[i * 3 + 1] * 1e3)},${Math.round(pos[i * 3 + 2] * 1e3)}`;
    keys[i] = k;
    let a = acc.get(k);
    if (!a) { a = [0, 0, 0]; acc.set(k, a); }
    a[0] += nor[i * 3]; a[1] += nor[i * 3 + 1]; a[2] += nor[i * 3 + 2];
  }
  const out = new Float32Array(pos.length);
  for (let i = 0; i < keys.length; i++) {
    const a = acc.get(keys[i]);
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    out[i * 3] = a[0] / l; out[i * 3 + 1] = a[1] / l; out[i * 3 + 2] = a[2] / l;
  }
  geo.setAttribute("onormal", new THREE.BufferAttribute(out, 3));
}

function merge(parts) {
  const geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  addOutlineNormals(geo);
  geo.computeBoundingSphere();
  return geo;
}

// Lathe d'un profil fermé (épaisseur), phi optionnel
function lathe(profile, seg, phiStart = 0, phiLength = Math.PI * 2) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg, phiStart, phiLength);
}

// Cylindre fin entre deux points (ficelle)
function stick(a, b, radius, color) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(radius, radius, len, 6, 1);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const dir = vb.clone().sub(va).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q);
  return part(g, color, { p: mid.toArray(), r: [e.x, e.y, e.z] });
}

// Cape de sphère (calotte) de rayon R, centrée à cy, jusqu'à l'angle a (depuis le pôle)
function cap(R, a, cy, color, seg = 22) {
  return part(new THREE.SphereGeometry(R, seg, 8, 0, Math.PI * 2, 0, a), color, { p: [0, cy, 0] });
}

// ---------------------------------------------------------------------
// Modèles. Chaque fonction renvoie { parts, anchor, fit, anim?, hideTuft? }
// Coordonnées locales à l'ancre ; corps ≈ sphère de rayon 1 (adulte non déformé).
// fit : recalage sur la forme du corps ; anim : animation légère par image.
// ---------------------------------------------------------------------
const MODELS = {
  // --- tête (ancre au sommet du crâne ; centre du corps à y = -1)
  bonnet: (c) => ({
    anchor: "tete", fit: "tete", hideTuft: true,
    parts: [
      cap(1.07, 0.66, -1.0, c.main),
      // revers côtelé
      part(new THREE.TorusGeometry(0.64, 0.095, 8, 28), c.dark, { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0] }),
      // pompon
      part(new THREE.IcosahedronGeometry(0.17, 1), c.premium ? c.light : WHITE, { p: [0, 0.12, 0] }),
    ],
    tilt: [0.05, 0, 0.1],
  }),
  casquette: (c) => ({
    anchor: "tete", fit: "tete", hideTuft: true,
    parts: [
      cap(1.06, 0.74, -1.0, c.main),
      // visière
      part(new THREE.CylinderGeometry(0.5, 0.5, 0.045, 22, 1, false, -Math.PI / 2, Math.PI), c.dark,
        { p: [0, -0.27, 0.5], r: [0.22, 0, 0], s: [1, 1, 0.95] }),
      part(new THREE.SphereGeometry(0.065, 10, 6), c.dark, { p: [0, 0.06, 0] }),
      // petit écusson
      part(new THREE.CircleGeometry(0.09, 14), c.premium ? c.light : c.ink, { p: [0, -0.07, 0.6], r: [-0.62, 0, 0] }),
    ],
    tilt: [0, 0.18, 0],
  }),
  "chapeau-fete": (c) => {
    const parts = [
      part(new THREE.ConeGeometry(0.34, 0.82, 22, 3), c.main, { p: [0, 0.33, 0] }),
      part(new THREE.TorusGeometry(0.33, 0.055, 6, 24), c.premium ? c.dark : WHITE, { p: [0, -0.07, 0], r: [Math.PI / 2, 0, 0] }),
      part(new THREE.IcosahedronGeometry(0.11, 1), c.premium ? c.light : WHITE, { p: [0, 0.76, 0] }),
    ];
    // pois
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, h = i % 2 ? 0.18 : 0.38, rr = 0.34 * (1 - (h + 0.08) / 0.82) + 0.012;
      parts.push(part(new THREE.SphereGeometry(0.05, 8, 6), c.premium ? c.light : c.ink, { p: [Math.sin(a) * rr, h, Math.cos(a) * rr], s: [1, 1, 0.5], r: [0, a, 0] }));
    }
    return { anchor: "tete", fit: "tete", hideTuft: true, parts, tilt: [0.05, 0, -0.2] };
  },
  noeud: (c) => ({
    anchor: "tete", fit: "tete",
    parts: [
      part(new THREE.SphereGeometry(0.2, 14, 10), c.main, { p: [-0.19, 0, 0], r: [0, 0, 0.35], s: [1.15, 0.75, 0.42] }),
      part(new THREE.SphereGeometry(0.2, 14, 10), c.main, { p: [0.19, 0, 0], r: [0, 0, -0.35], s: [1.15, 0.75, 0.42] }),
      part(new THREE.SphereGeometry(0.085, 10, 8), c.dark, { s: [1, 1.1, 0.8] }),
      part(new THREE.ConeGeometry(0.06, 0.2, 8), c.dark, { p: [-0.08, -0.14, 0], r: [0, 0, -0.5] }),
      part(new THREE.ConeGeometry(0.06, 0.2, 8), c.dark, { p: [0.08, -0.14, 0], r: [0, 0, 0.5] }),
    ],
    // glissé sur le côté du crâne (la houppette part vers +x : le nœud à gauche)
    tilt: [0.22, 0, 0.62],
  }),
  "oreilles-chat": (c) => {
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push(part(new THREE.ConeGeometry(0.22, 0.42, 4, 1), c.main, { p: [s * 0.44, -0.08, 0], r: [0, 0, -s * 0.48], s: [1, 1, 0.55] }));
      parts.push(part(new THREE.ConeGeometry(0.13, 0.27, 4, 1), c.premium === "galaxie" ? c.dark : PINK, { p: [s * 0.452, -0.1, 0.05], r: [0, 0, -s * 0.48], s: [1, 1, 0.5] }));
    }
    return { anchor: "tete", fit: "tete", parts };
  },
  couronne: (c) => {
    const parts = [part(lathe([[0.3, -0.1], [0.35, -0.1], [0.37, 0.08], [0.32, 0.08], [0.3, -0.1]], 14), c.main)];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(part(new THREE.ConeGeometry(0.075, 0.2, 6), c.main, { p: [Math.sin(a) * 0.345, 0.17, Math.cos(a) * 0.345] }));
      parts.push(part(new THREE.SphereGeometry(0.035, 8, 6), c.light, { p: [Math.sin(a) * 0.345, 0.285, Math.cos(a) * 0.345] }));
    }
    parts.push(part(new THREE.OctahedronGeometry(0.06, 0), "#e8453c", { p: [0, -0.01, 0.37], s: [1, 1.25, 0.6] }));
    parts.push(part(new THREE.OctahedronGeometry(0.045, 0), "#3b7ddd", { p: [0.25, -0.01, 0.27], r: [0, 0.75, 0], s: [1, 1.25, 0.6] }));
    parts.push(part(new THREE.OctahedronGeometry(0.045, 0), "#4cbf4b", { p: [-0.25, -0.01, 0.27], r: [0, -0.75, 0], s: [1, 1.25, 0.6] }));
    return { anchor: "tete", fit: "tete", parts, offset: [0, -0.03, 0], tilt: [-0.08, 0, 0.12] };
  },

  // --- yeux (ancre devant le visage, entre les yeux)
  "lunettes-rondes": (c, ud) => {
    const ex = ud.eyeX || 0.34, ez = ud.eyeZ || -0.06, rot = Math.asin(Math.min(0.9, ex));
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push(part(new THREE.TorusGeometry(0.17, 0.03, 8, 26), c.main, { p: [s * ex, 0, ez + 0.07], r: [0, s * rot * 0.8, 0] }));
      // branche courte vers l'arrière
      parts.push(part(new THREE.CapsuleGeometry(0.022, 0.16, 3, 6), c.main, { p: [s * (ex + 0.22), 0.02, ez - 0.02], r: [Math.PI / 2, 0, s * 0.6] }));
    }
    parts.push(part(new THREE.TorusGeometry(0.075, 0.024, 6, 12, Math.PI), c.main, { p: [0, 0.03, 0.07] }));
    return { anchor: "yeux", fit: "yeux", parts, tilt: [-0.32, 0, 0] };
  },
  "lunettes-soleil": (c, ud) => {
    const ex = ud.eyeX || 0.34, ez = ud.eyeZ || -0.06, rot = Math.asin(Math.min(0.9, ex));
    const parts = [];
    for (const s of [-1, 1]) {
      const t = { p: [s * ex, 0, ez + 0.08], r: [Math.PI / 2, 0, -s * rot * 0.8], s: [1.12, 1, 0.86] };
      parts.push(part(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 22), c.key === "noir" ? "#3a4256" : LENS, t));
      parts.push(part(new THREE.TorusGeometry(0.19, 0.032, 8, 26), c.main, { p: [s * ex, 0, ez + 0.085], r: [0, s * rot * 0.8, 0], s: [1.12, 0.86, 1] }));
      // reflet
      parts.push(part(new THREE.CapsuleGeometry(0.018, 0.1, 2, 6), "#ffffff", { p: [s * ex - 0.06, 0.06, ez + 0.11 + s * 0.02 * rot], r: [0, s * rot * 0.8, 0.7] }));
      parts.push(part(new THREE.CapsuleGeometry(0.024, 0.16, 3, 6), c.main, { p: [s * (ex + 0.25), 0.03, ez - 0.02], r: [Math.PI / 2, 0, s * 0.6] }));
    }
    parts.push(part(new THREE.CapsuleGeometry(0.026, 0.14, 3, 6), c.main, { p: [0, 0.05, 0.08], r: [0, 0, Math.PI / 2] }));
    return { anchor: "yeux", fit: "yeux", parts, tilt: [-0.32, 0, 0] };
  },

  // --- cou (ancre sur l'axe du corps, sous la bouche)
  echarpe: (c, ud) => {
    const f = ud.front || 1;
    // pan qui pend devant (penché sur le ventre), avec deux rayures
    const rot = [-0.38, 0, 0.12], axis = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...rot));
    const at = (k) => [0.38 + axis.x * k, -0.3 + axis.y * k, f * 0.9 + 0.06 + axis.z * k];
    return {
      anchor: "cou", fit: "ring",
      parts: [
        part(new THREE.TorusGeometry(1.0, 0.11, 8, 40), c.main, { r: [Math.PI / 2, 0, 0], s: [1.04, 1.04, 1.25] }),
        part(new THREE.CapsuleGeometry(0.1, 0.36, 3, 10), c.main, { p: at(0), r: rot, s: [1.2, 1, 0.5] }),
        part(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 12), c.dark, { p: at(-0.06), r: rot, s: [1.2, 1, 0.55] }),
        part(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 12), c.dark, { p: at(-0.17), r: rot, s: [1.2, 1, 0.55] }),
        // nœud
        part(new THREE.SphereGeometry(0.15, 12, 8), c.dark, { p: [0.36, -0.03, f * 1.0], s: [1, 0.85, 0.7] }),
      ],
    };
  },
  "noeud-papillon": (c, ud) => {
    const f = (ud.front || 1) + 0.03;
    return {
      anchor: "cou", fit: "ring",
      parts: [
        part(new THREE.ConeGeometry(0.15, 0.27, 10), c.main, { p: [-0.13, 0.03, f], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.5] }),
        part(new THREE.ConeGeometry(0.15, 0.27, 10), c.main, { p: [0.13, 0.03, f], r: [0, 0, Math.PI / 2], s: [1, 1, 0.5] }),
        part(new THREE.SphereGeometry(0.07, 10, 8), c.dark, { p: [0, 0.03, f + 0.02], s: [1, 1.15, 0.8] }),
      ],
    };
  },

  // --- haut en 3D
  tutu: (c) => {
    const g = lathe([[0.92, 0.06], [1.34, -0.04], [1.36, -0.09], [0.92, -0.04], [0.92, 0.06]], 56);
    const g2 = lathe([[0.88, -0.02], [1.46, -0.13], [1.48, -0.18], [0.88, -0.1], [0.88, -0.02]], 56);
    // volants : le bord extérieur ondule
    for (const geo of [g, g2]) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
        if (r < 1.15) continue;
        const a = Math.atan2(z, x), k = 1 + 0.05 * Math.sin(a * 14);
        p.setXYZ(i, x * k, p.getY(i) + 0.035 * Math.sin(a * 14 + 1), z * k);
      }
      geo.computeVertexNormals();
    }
    return {
      anchor: "haut", fit: "ring", offset: [0, -0.06, 0],
      parts: [part(g2, c.dark), part(g, c.main)],
    };
  },
  // capuche du sweat (le corps du sweat est peint)
  sweat: (c) => ({
    anchor: "dos", fit: "dos", offset: [0, 0.4, 0.02],
    parts: [
      part(new THREE.TorusGeometry(0.3, 0.12, 8, 22), c.main, { r: [0.45, 0, 0], s: [1.15, 1, 1] }),
      part(new THREE.SphereGeometry(0.31, 14, 10), c.dark, { p: [0, -0.02, -0.06], r: [0.45, 0, 0], s: [1.05, 0.9, 0.45] }),
    ],
  }),

  // --- dos (ancre derrière, à mi-hauteur)
  "sac-dos": (c) => ({
    anchor: "dos", fit: "dos", offset: [0, -0.05, -0.16],
    parts: [
      part(new THREE.CapsuleGeometry(0.33, 0.3, 4, 14), c.main, { s: [1.05, 1, 0.55] }),
      part(new THREE.CapsuleGeometry(0.2, 0.08, 4, 12), c.dark, { p: [0, -0.15, -0.16], s: [1.1, 1, 0.5] }),
      part(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), c.dark, { p: [0, 0.2, -0.01], s: [1.05, 0.9, 0.62] }),
      part(new THREE.TorusGeometry(0.09, 0.025, 6, 14, Math.PI), c.dark, { p: [0, 0.52, 0.02] }),
      part(new THREE.SphereGeometry(0.035, 8, 6), c.premium ? c.light : WHITE, { p: [0, 0.0, -0.2] }),
    ],
  }),
  "ballon-attache": (c) => {
    const top = [0.6, 1.55, -0.25];
    return {
      anchor: "dos", fit: "dos", anim: "balloon",
      parts: [
        part(new THREE.SphereGeometry(0.36, 18, 14), c.main, { p: top, s: [1, 1.18, 1] }),
        part(new THREE.ConeGeometry(0.06, 0.09, 8), c.dark, { p: [top[0], top[1] - 0.44, top[2]], r: [Math.PI, 0, 0] }),
        part(new THREE.SphereGeometry(0.07, 8, 6), "#ffffff", { p: [top[0] - 0.14, top[1] + 0.17, top[2] + 0.26], s: [0.8, 1.3, 0.5], r: [0, 0, 0.5] }),
        stick([0.12, 0.05, -0.04], [top[0], top[1] - 0.47, top[2]], 0.012, STRING),
      ],
    };
  },
  cape: (c) => {
    const prof = [[1.03, 0.06], [1.1, -0.3], [1.26, -0.82], [1.22, -0.85], [1.06, -0.3], [0.99, 0.06], [1.03, 0.06]];
    const span = 2.5;
    return {
      anchor: "cou", fit: "ring", anim: "cape", offset: [0, 0.02, 0],
      parts: [
        part(lathe(prof, 26, Math.PI - span / 2, span), c.main),
        part(new THREE.TorusGeometry(1.0, 0.06, 6, 30, span + 0.3), c.dark, { r: [Math.PI / 2, 0, (3 * Math.PI) / 2 - (span + 0.3) / 2], p: [0, 0.07, 0] }),
        part(new THREE.SphereGeometry(0.07, 10, 8), c.premium ? c.light : "#ffd23f", { p: [0.86, 0.05, 0.5] }),
        part(new THREE.SphereGeometry(0.07, 10, 8), c.premium ? c.light : "#ffd23f", { p: [-0.86, 0.05, 0.5] }),
      ],
    };
  },
  "ailes-papillon": (c) => {
    const parts = [];
    for (const s of [-1, 1]) {
      parts.push(part(new THREE.SphereGeometry(0.52, 18, 10), c.main, { p: [s * 0.66, 0.42, 0], r: [0, 0, s * 0.55], s: [1, 0.74, 0.06] }));
      parts.push(part(new THREE.SphereGeometry(0.36, 14, 8), c.dark, { p: [s * 0.52, -0.16, 0.012], r: [0, 0, -s * 0.45], s: [1, 0.8, 0.06] }));
      for (const z of [-0.04, 0.04]) {
        parts.push(part(new THREE.SphereGeometry(0.12, 10, 6), WHITE, { p: [s * 0.88, 0.62, z], s: [1, 1, 0.3] }));
        parts.push(part(new THREE.SphereGeometry(0.07, 8, 6), c.premium === "or" ? "#b8860b" : INK, { p: [s * 0.5, 0.36, z], s: [1, 1, 0.3] }));
        parts.push(part(new THREE.SphereGeometry(0.075, 8, 6), c.light, { p: [s * 0.6, -0.22, z * 1.2], s: [1, 1, 0.3] }));
      }
    }
    parts.push(part(new THREE.CapsuleGeometry(0.05, 0.4, 3, 8), INK, { p: [0, 0.1, 0] }));
    return { anchor: "dos", fit: "dos", anim: "wings", offset: [0, 0.1, -0.1], parts };
  },
};

// ---------------------------------------------------------------------
// Hauts peints dans la peau
// ---------------------------------------------------------------------
const latY = (py, h) => (Math.acos(Math.max(-1, Math.min(1, py))) / Math.PI) * h;
const PAINT_SHAPES = {
  tshirt: { top: -0.06, hem: -0.8, neck: "round", neckPy: -0.2, neckW: 150 },
  mariniere: { top: -0.07, hem: -0.8, neck: "boat", neckPy: -0.14, neckW: 210 },
  "maillot-foot": { top: -0.06, hem: -0.8, neck: "v", neckPy: -0.24, neckW: 120 },
  "pull-noel": { top: -0.05, hem: -0.86, neck: "round", neckPy: -0.18, neckW: 150 },
  sweat: { top: -0.05, hem: -0.86, neck: "round", neckPy: -0.2, neckW: 160 },
};

function neckPath(ctx, sh, w, h, startNew) {
  const cx = w * 0.25, y0 = latY(sh.top, h), yN = latY(sh.neckPy, h), hw = sh.neckW;
  if (startNew) { ctx.beginPath(); ctx.moveTo(cx - hw, y0); }
  if (sh.neck === "v") { ctx.lineTo(cx, yN); ctx.lineTo(cx + hw, y0); } else {
    // la courbe de Bézier n'atteint que ~75 % de la profondeur de ses points de contrôle
    const d = (yN - y0) / 0.75;
    ctx.bezierCurveTo(cx - hw * 0.55, y0 + d, cx + hw * 0.55, y0 + d, cx + hw, y0);
  }
}
function bandPath(ctx, sh, w, h) {
  const y0 = latY(sh.top, h), y1 = latY(sh.hem, h), cx = w * 0.25;
  ctx.beginPath();
  ctx.moveTo(0, y0); ctx.lineTo(cx - sh.neckW, y0);
  neckPath(ctx, sh, w, h, false);
  ctx.lineTo(w, y0); ctx.lineTo(w, y1); ctx.lineTo(0, y1); ctx.closePath();
}
function fabric(ctx, c, h, sh) {
  if (c.premium === "galaxie") {
    const pat = ctx.createPattern(getGalaxyCanvas(), "repeat");
    return pat || c.hex;
  }
  if (c.premium === "or") {
    const y0 = latY(sh.top, h), y1 = latY(sh.hem, h);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, c.hex2); g.addColorStop(0.25, c.hex); g.addColorStop(0.42, "#fff3b0"); g.addColorStop(0.6, c.hex); g.addColorStop(1, c.hex2);
    return g;
  }
  return c.main;
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function ribbing(ctx, w, y, hgt, color, lines) {
  ctx.fillStyle = color; ctx.fillRect(0, y, w, hgt);
  ctx.strokeStyle = lines; ctx.lineWidth = 4; ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let x = 6; x < w; x += 16) { ctx.moveTo(x, y + 4); ctx.lineTo(x, y + hgt - 4); }
  ctx.stroke(); ctx.globalAlpha = 1;
}

function makeTopPainter(id, colorKey) {
  const sh = PAINT_SHAPES[id];
  if (!sh) return null;
  const c = palette(colorKey);
  // couleur des motifs (contraste lisible sur le tissu)
  const motif = c.premium === "galaxie" ? "#ffffff" : c.premium === "or" ? "#8a5a00" : c.ink;
  return (ctx, w, h, { uv }) => {
    const y0 = latY(sh.top, h), y1 = latY(sh.hem, h), cx = w * 0.25;
    ctx.save();
    bandPath(ctx, sh, w, h);
    ctx.fillStyle = id === "mariniere" ? WHITE : fabric(ctx, c, h, sh);
    ctx.fill();
    ctx.clip();
    // léger volume sur le ventre
    const [bx, by] = uv(0, -0.42);
    const hl = ctx.createRadialGradient(bx, by, 10, bx, by, 260);
    hl.addColorStop(0, "rgba(255,255,255,0.22)"); hl.addColorStop(1, "rgba(255,255,255,0)");

    if (id === "mariniere") {
      ctx.fillStyle = fabric(ctx, c, h, sh);
      for (let y = y0 + 34; y < y1 - 10; y += 46) ctx.fillRect(0, y, w, 20);
    } else if (id === "maillot-foot") {
      // bandes sur les côtés, numéro devant et dans le dos
      ctx.fillStyle = motif;
      for (const x of [0, w * 0.5, w]) ctx.fillRect(x - 26, y0, 52, y1 - y0);
      ctx.fillStyle = c.premium ? motif : c.dark;
      for (const x of [0, w * 0.5, w]) ctx.fillRect(x - 8, y0, 16, y1 - y0);
      ctx.font = "900 150px Fredoka, Nunito, system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineJoin = "round"; ctx.lineWidth = 12; ctx.strokeStyle = OUTLINE; ctx.fillStyle = motif;
      ctx.strokeText("10", cx, by - 6); ctx.fillText("10", cx, by - 6);
      ctx.font = "900 230px Fredoka, Nunito, system-ui, sans-serif";
      ctx.strokeText("10", w * 0.75, by - 10); ctx.fillText("10", w * 0.75, by - 10);
    } else if (id === "pull-noel") {
      // frise blanche en zigzag, flocons
      const yA = latY(-0.34, h), yB = latY(-0.52, h);
      const contrast = c.key === "rouge" ? "#2f9a44" : c.key === "vert" ? "#d8322c" : c.premium ? c.dark : "#d8322c";
      ctx.fillStyle = WHITE; ctx.fillRect(0, yA, w, yB - yA);
      ctx.fillStyle = contrast;
      const m = (yA + yB) / 2, amp = (yB - yA) * 0.34;
      ctx.beginPath(); ctx.moveTo(0, m + amp);
      for (let x = 0; x <= w; x += 64) { ctx.lineTo(x + 32, m - amp); ctx.lineTo(x + 64, m + amp); }
      ctx.lineTo(w, m + amp + 8); ctx.lineTo(0, m + amp + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = WHITE;
      for (let x = 30; x < w; x += 96) {
        ctx.beginPath(); ctx.arc(x, yA - 30, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 48, yB + 32, 9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = WHITE; ctx.lineWidth = 7; ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const fx = (i + 0.5) * (w / 6) + (i % 2 ? 40 : -40), fy = (y0 + yA) / 2 + 14 + (i % 2) * 18, r = 26;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          ctx.moveTo(fx - Math.cos(a) * r, fy - Math.sin(a) * r); ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r);
        }
        ctx.stroke();
      }
      ribbing(ctx, w, y1 - 46, 46, c.premium ? c.dark : c.dark, WHITE);
    } else if (id === "sweat") {
      // poche kangourou et cordons
      const pw = 300, ph = 120, py = latY(-0.6, h) - ph / 2;
      ctx.fillStyle = c.premium ? "rgba(0,0,0,0.18)" : c.dark;
      ctx.beginPath(); ctx.roundRect(cx - pw / 2, py, pw, ph, 30); ctx.fill();
      ctx.strokeStyle = c.premium ? "rgba(255,255,255,0.5)" : shade(c.main, -0.4); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(cx - pw / 2 + 22, py + 8); ctx.lineTo(cx - pw / 2 + 8, py + ph - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + pw / 2 - 22, py + 8); ctx.lineTo(cx + pw / 2 - 8, py + ph - 10); ctx.stroke();
      const yN = latY(sh.neckPy, h);
      ctx.strokeStyle = WHITE; ctx.lineWidth = 9; ctx.lineCap = "round";
      ctx.fillStyle = WHITE;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(cx + s * 40, yN - 6); ctx.quadraticCurveTo(cx + s * 50, yN + 60, cx + s * 44, yN + 120); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + s * 44, yN + 126, 11, 0, Math.PI * 2); ctx.fill();
      }
      ribbing(ctx, w, y1 - 52, 52, c.premium ? "rgba(0,0,0,0.2)" : c.dark, c.premium ? "#ffffff" : shade(c.main, 0.3));
    } else {
      // t-shirt : petite étoile sur la poitrine, ourlet
      ctx.fillStyle = motif;
      const [sx, sy] = uv(-0.34, -0.27);
      star(ctx, sx, sy, 38);
      ctx.fillStyle = c.premium ? "rgba(0,0,0,0.16)" : c.dark;
      ctx.fillRect(0, y1 - 24, w, 24);
    }
    ctx.fillStyle = hl; ctx.fillRect(bx - 280, by - 280, 560, 560);
    ctx.restore();

    // col (par-dessus, hors découpe pour garder un bord net)
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = id === "mariniere" ? fabric(ctx, c, h, sh) : id === "maillot-foot" ? motif : (c.premium ? c.light : c.dark);
    ctx.lineWidth = id === "pull-noel" ? 30 : 22;
    ctx.beginPath(); ctx.moveTo(cx - sh.neckW, y0); neckPath(ctx, sh, w, h, false); ctx.stroke();
    // bord du col autour du corps (dos)
    ctx.lineWidth = 10; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(0, y0 + 4); ctx.lineTo(cx - sh.neckW, y0 + 4); ctx.moveTo(cx + sh.neckW, y0 + 4); ctx.lineTo(w, y0 + 4); ctx.stroke();
    ctx.restore();
  };
}

// ---------------------------------------------------------------------
// État par créature
// ---------------------------------------------------------------------
const STATES = new WeakMap();
// largeur de référence (corps adulte non déformé) de chaque ancre
const REF = { tete: 0.694, yeux: 0.34, ring: 0.993, haut: 0.917, dos: 0.997 };
const clampS = (v) => Math.max(0.6, Math.min(1.6, v || 1));

function stateOf(creature) {
  let st = STATES.get(creature);
  if (!st) {
    st = { mats: makeMaterials(), base: {}, preview: null, slots: {}, topKey: "", unFrame: null, unReshape: null, tuft: undefined, previewToken: 0 };
    STATES.set(creature, st);
    if (creature.onReshape) st.unReshape = creature.onReshape(() => refit(st, creature));
  }
  return st;
}

function findTuft(creature) {
  const body = creature.three?.body;
  if (!body) return null;
  return body.children.find((o) => o.isGroup && !String(o.name).startsWith("anchor-") && o.children.some((ch) => ch.geometry?.type === "TubeGeometry")) || null;
}

function fitHolder(holder, creature) {
  const { fit, anchorSlot } = holder.userData;
  const ud = creature.anchor(anchorSlot)?.userData || {};
  if (fit === "ring") {
    const ref = anchorSlot === "haut" ? REF.haut : REF.ring;
    holder.scale.set(clampS((ud.radius || ref) / ref), 1, clampS((ud.depth || ref) / ref));
  } else if (fit === "yeux") {
    holder.scale.setScalar(clampS((ud.eyeX || REF.yeux) / REF.yeux));
  } else {
    holder.scale.setScalar(clampS((ud.radius || REF[fit] || 1) / (REF[fit] || 1)));
  }
}
function refit(st, creature) {
  for (const s of Object.values(st.slots)) if (s.holder) fitHolder(s.holder, creature);
}

function disposeSlot(s) {
  if (!s?.holder) return;
  s.holder.parent?.remove(s.holder);
  s.mesh.geometry.dispose();
}

function buildSlot(st, creature, slot, id, colorKey) {
  const model = MODELS[id];
  if (!model) return null;
  const c = palette(colorKey);
  const def = model(c, creature.anchor(MODELS_ANCHOR[id] || slot)?.userData || {});
  const anchor = creature.anchor(def.anchor);
  if (!anchor) { for (const g of def.parts) g.dispose(); return null; }
  const geo = merge(def.parts);
  const mesh = new THREE.Mesh(geo, st.mats[c.premium] || st.mats.base);
  mesh.add(new THREE.Mesh(geo, st.mats.outline));
  // tête : pivot au centre du corps (1 sous le sommet), un chapeau penché glisse sur le crâne
  if (def.anchor === "tete") { geo.translate(0, 1, 0); mesh.position.y = -1; }
  if (def.tilt) mesh.rotation.set(def.tilt[0], def.tilt[1], def.tilt[2]);
  const holder = new THREE.Group();
  holder.name = `tenue-${slot}`;
  holder.userData = { fit: def.fit, anchorSlot: def.anchor };
  if (def.offset) holder.position.set(def.offset[0], def.offset[1], def.offset[2]);
  holder.add(mesh);
  anchor.add(holder);
  fitHolder(holder, creature);
  return { holder, mesh, anim: def.anim || null, hideTuft: !!def.hideTuft, galaxy: c.premium === "galaxie", baseRot: mesh.rotation.clone() };
}
// ancre lue pour les dimensions au moment de construire (yeux : écart des yeux, cou : avant du corps)
const MODELS_ANCHOR = { echarpe: "cou", "noeud-papillon": "cou", cape: "cou", tutu: "haut", sweat: "dos" };

// animations : aucune allocation par image
function makeFrameFn(st) {
  return (dt, t) => {
    let anyGalaxy = false;
    for (const slot of SLOTS) {
      const s = st.slots[slot];
      if (!s?.mesh) continue;
      if (s.galaxy) anyGalaxy = true;
      const m = s.mesh, b = s.baseRot;
      if (s.anim === "balloon") {
        m.rotation.z = b.z + Math.sin(t * 1.3) * 0.07;
        m.rotation.x = b.x + Math.sin(t * 1.7 + 1) * 0.05;
      } else if (s.anim === "wings") {
        m.scale.x = 0.86 + Math.sin(t * 3.2) * 0.14;
      } else if (s.anim === "cape") {
        m.rotation.x = b.x - 0.04 - Math.sin(t * 1.6) * 0.035;
      }
    }
    if (anyGalaxy && galaxyTex) galaxyTex.offset.x = (galaxyTex.offset.x + dt * 0.012) % 1;
  };
}
function updateFrameHook(st, creature) {
  const need = Object.values(st.slots).some((s) => s?.anim || s?.galaxy);
  if (need && !st.unFrame && creature.onFrame) st.unFrame = creature.onFrame(makeFrameFn(st));
  else if (!need && st.unFrame) { st.unFrame(); st.unFrame = null; }
}

const keyOf = (e) => (e && e.id ? `${e.id}:${e.color}` : "");

function render(st, creature) {
  const shown = st.preview ? { ...st.base, ...st.preview } : st.base;
  let hideTuft = false;
  for (const slot of SLOTS) {
    const e = shown?.[slot];
    const item = e?.id ? itemById(e.id) : null;
    const valid = item && item.slot === slot && !item.soon && COLORS[e.color] && !COLORS[e.color].soon ? e : null;
    const key = keyOf(valid);
    const cur = st.slots[slot];
    if (!cur || cur.key !== key) {
      disposeSlot(cur);
      let built = null;
      if (valid && MODELS[valid.id]) {
        try { built = buildSlot(st, creature, slot, valid.id, valid.color); } catch (err) { console.error("[cosmetics3d]", err); }
      }
      st.slots[slot] = { key, ...(built || {}) };
    }
    if (st.slots[slot].hideTuft) hideTuft = true;
  }
  // haut peint dans la peau
  const top = shown?.haut;
  const topItem = top?.id ? itemById(top.id) : null;
  const topKey = topItem && PAINT_SHAPES[top.id] && !topItem.soon && COLORS[top.color] ? keyOf(top) : "";
  if (topKey !== st.topKey) {
    st.topKey = topKey;
    creature.setSkinOverlay?.(topKey ? makeTopPainter(top.id, top.color) : null);
  }
  // houppette cachée sous les chapeaux qui la recouvrent
  if (st.tuft === undefined) st.tuft = findTuft(creature);
  if (st.tuft) st.tuft.visible = !hideTuft;
  updateFrameHook(st, creature);
}

const clean = (outfit) => {
  const o = {};
  for (const slot of SLOTS) o[slot] = outfit?.[slot] && outfit[slot].id ? { id: outfit[slot].id, color: outfit[slot].color } : null;
  return o;
};

// Tenue portée (remplace la précédente ; seuls les emplacements modifiés sont reconstruits)
export function applyOutfit(creature, outfit) {
  if (!creature?.anchor) return;
  const st = stateOf(creature);
  st.base = clean(outfit);
  render(st, creature);
}

// Essayage : outfit partiel ou complet, fusionné avec la tenue portée
// (un emplacement à null dans l'essayage le vide). Renvoie restore().
export function previewOutfit(creature, outfit) {
  if (!creature?.anchor) return () => {};
  const st = stateOf(creature);
  const p = {};
  for (const slot of SLOTS) if (outfit && slot in outfit) p[slot] = outfit[slot] && outfit[slot].id ? { id: outfit[slot].id, color: outfit[slot].color } : null;
  st.preview = p;
  const token = ++st.previewToken;
  render(st, creature);
  return () => {
    if (st.previewToken !== token || !STATES.has(creature)) return;
    st.preview = null;
    render(st, creature);
  };
}

export function endPreview(creature) {
  const st = creature && STATES.get(creature);
  if (!st || !st.preview) return;
  st.preview = null;
  st.previewToken++;
  render(st, creature);
}

export function isPreviewing(creature) {
  return !!(creature && STATES.get(creature)?.preview);
}

// Retire tout et libère les ressources propres à cette créature
export function disposeOutfit(creature) {
  const st = creature && STATES.get(creature);
  if (!st) return;
  for (const slot of SLOTS) disposeSlot(st.slots[slot]);
  st.slots = {};
  st.unFrame?.(); st.unReshape?.();
  if (st.topKey) { try { creature.setSkinOverlay?.(null); } catch { /* créature détruite */ } }
  if (st.tuft) st.tuft.visible = true;
  for (const k of ["base", "or", "galaxie", "outline"]) st.mats[k].dispose();
  STATES.delete(creature);
}

// Nombre d'appels de dessin de la tenue affichée (contrôle du budget, ≤ 12)
export function outfitDrawCalls(creature) {
  const st = creature && STATES.get(creature);
  if (!st) return 0;
  return Object.values(st.slots).reduce((n, s) => n + (s?.mesh ? 2 : 0), 0);
}
