// lib/world3d.js
// Le décor 3D autour de la créature : prairie, chemin, arbres, mare, lanterne,
// fleurs, papillons le jour et lucioles la nuit.
//
// Deux VUES à la maison, au choix en une ligne (HOME_VIEW ci-dessous) :
//   "studio" : écran de création de personnage : la créature seule sur un fond bleu en dégradé doux, sans sol ni
//              horizon, ombre douce sous les pieds, éclairage de studio (clé chaude, contre-jour, ciel bleuté).
//              La prairie n'est alors ni dessinée ni mise à jour ; elle revient pendant les activités (foot, course, télé).
//   "pre"    : l'ancienne prairie, tout le temps.
// Pendant le foot, vue "terrain" : décor simplifié, le ciel et un grand pré tondu à bandes, rien d'autre
// (ni arbres, ni mare, ni fleurs, ni papillons) : le ballon et les cercles se lisent bien.
// Deux rendus, au choix en une ligne (RENDER_STYLE ci-dessous, lu aussi par creature3d.js) :
//   "doux" : lumière douce façon jeu de vie : matières lisses (Lambert / Standard), ombres portées du soleil,
//            ciel qui éclaire les ombres en bleuté, brouillard exponentiel, formes organiques, herbe en lames.
//   "toon" : l'ancien rendu à paliers (MeshToonMaterial + contours).
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { SKY } from "./gameUi.js";

// --- Interrupteur de la vue d'accueil : "studio" (fond bleu, créature seule) ou "pre" (l'ancienne prairie)
export const HOME_VIEW = "studio";

// --- Interrupteur du rendu : "doux" (nouveau) ou "toon" (ancien, tel qu'avant)
export const RENDER_STYLE = "doux";
const DOUX = RENDER_STYLE === "doux";
// le studio a besoin du rendu doux (ombres portées réelles, lumières Lambert / Standard)
export const USE_STUDIO = HOME_VIEW === "studio" && DOUX;

// --- Réglages de la vue studio
// bg : dégradé du fond (haut / milieu / bas) par moment de la journée ; la nuit reste lisible, un peu plus profonde
const STUDIO_BG = {
  dawn: { top: "#6590d9", mid: "#84b6de", bot: "#a0d4c6" },
  day: { top: "#5b8fd6", mid: "#7fb6e0", bot: "#8fd3c1" },
  dusk: { top: "#5a7ccb", mid: "#7da0d6", bot: "#93c0c6" },
  night: { top: "#243c80", mid: "#3158a0", bot: "#3d7f9a" },
};
const STUDIO = {
  halo: 0.14,            // force du halo clair derrière la créature (0 = aucun)
  vignette: 0.2,         // assombrissement doux des bords (0 = aucun)
  floorShadow: 0.2,      // opacité de l'ombre portée réelle sur le sol invisible (0 = aucune)
  contactShadow: 0.55,   // opacité de l'ombre de contact sous les pieds
  contactTint: "#3a5a9c", // teinte de l'ombre de contact (multipliée avec la texture brune : donne un ombrage bleuté)
  sunPos: [-1.8, 8, 2.6], // lumière clé : en haut, un peu à gauche et devant (ombre ronde sous les pieds)
  shadowHalf: 3.4,       // demi-largeur de la caméra d'ombre : serrée, donc nette malgré une carte d'ombre légère
};
// éclairage du studio par moment : clé chaude (sun), ciel qui remplit (sky / ground), contre-jour (rim)
const LIGHTS_STUDIO = {
  dawn: { sky: "#d6e4ff", ground: "#a6d6cc", hemi: 1.5, sun: "#ffdcc0", sunI: 2.3, rim: "#cfe2ff", rimI: 1.25, lamp: 0, fire: 0, fly: 0 },
  day: { sky: "#cfe6ff", ground: "#a2d8cf", hemi: 1.5, sun: "#ffe8c6", sunI: 2.3, rim: "#d4e8ff", rimI: 1.3, lamp: 0, fire: 0, fly: 0 },
  dusk: { sky: "#c4d0f4", ground: "#9fc4cc", hemi: 1.45, sun: "#ffd2b0", sunI: 2.2, rim: "#c4d4ff", rimI: 1.3, lamp: 0, fire: 0, fly: 0 },
  night: { sky: "#93a8f0", ground: "#6283bd", hemi: 1.4, sun: "#c3ceff", sunI: 1.7, rim: "#9bb8ff", rimI: 1.5, lamp: 0, fire: 0, fly: 0 },
};

// --- Réglages du décor (tout ce qui a été ajouté pour l'embellir est ici ; mettre à 0 pour désactiver)
const DECOR = {
  tuftCount: 240,        // touffes d'herbe instanciées en rendu "toon" (cônes). 0 = aucune
  tuftCountDoux: 900,    // touffes de lames fines en rendu "doux" (4 lames par touffe)
  windAmp: 0.35,         // amplitude du balancement de l'herbe au vent (0 = immobile)
  windSpeed: 1.8,        // vitesse du vent sur l'herbe
  flowerCount: 90,       // fleurs instanciées (avant : 70)
  crownHighlight: 0.28,  // éclaircissement du dessus des couronnes d'arbres (0 = pas de dégradé clair/foncé)
  cloudCount: 5,         // nuages doux qui dérivent au fond (0 = aucun)
  cloudSpeed: 0.12,      // vitesse de dérive des nuages (unités / seconde)
  pollenCount: 28,       // grains de pollen / pétales flottants le jour (0 = aucun)
  pondRipples: 2,        // cercles d'ondulation sur la mare (0 = aucun)
  fogDensity: 0.022,     // brouillard exponentiel du rendu "doux" (0 = aucun ; 0.03 = brume marquée)
};

// --- Ombres portées du soleil (rendu "doux")
const SUN_SHADOW = {
  pos: [-4.2, 6.4, 3.6], // soleil en haut à gauche, un peu devant : ombres douces qui tombent à droite et derrière
  half: 10,              // demi-largeur de la caméra d'ombre (unités) : plus petit = ombres plus nettes
  bias: -0.0004,         // biais de profondeur contre l'acné
  normalBias: 0.03,      // décalage selon la normale (acné sur les courbes)
  radius: 3,             // flou du bord (PCF)
};
// la caméra d'ombre est une boîte autour de l'origine, alignée sur la direction du soleil
const SH_AX = new THREE.Vector2(-SUN_SHADOW.pos[0], -SUN_SHADOW.pos[2]).normalize(); // sens des ombres sur le sol
const inShadowBox = (x, z) =>
  Math.abs(x * -SH_AX.y + z * SH_AX.x) < SUN_SHADOW.half * 0.9 && Math.abs(x * SH_AX.x + z * SH_AX.y) < SUN_SHADOW.half * 1.1;

// Éclairage par moment de la journée
const LIGHTS_TOON = {
  dawn: { sky: "#ffcfb3", ground: "#b8744a", hemi: 0.95, sun: "#ffad7a", sunI: 2.9, lamp: 0, fire: 0, fly: 1 },
  day: { sky: "#e8f4ff", ground: "#c98a4a", hemi: 0.95, sun: "#ffe7b0", sunI: 3.2, lamp: 0, fire: 0, fly: 1 },
  dusk: { sky: "#c79bff", ground: "#a2603e", hemi: 0.9, sun: "#ff8a4f", sunI: 2.7, lamp: 2.5, fire: 0.4, fly: 0.6 },
  night: { sky: "#8a9cff", ground: "#4a4f8a", hemi: 1.05, sun: "#b4c2ff", sunI: 1.5, lamp: 4, fire: 1, fly: 0 },
};
// Rendu doux : soleil chaud doré, ciel bleuté qui remplit les ombres, sol qui renvoie de la chaleur
const LIGHTS_DOUX = {
  dawn: { sky: "#ffd6cc", ground: "#d49272", hemi: 1.5, sun: "#ffb98a", sunI: 2.6, lamp: 0, fire: 0, fly: 1 },
  day: { sky: "#c4e0ff", ground: "#e6b87c", hemi: 1.55, sun: "#ffe6b8", sunI: 2.9, lamp: 0, fire: 0, fly: 1 },
  dusk: { sky: "#b9a2e8", ground: "#b8705a", hemi: 1.4, sun: "#ff9a62", sunI: 2.5, lamp: 3.6, fire: 0.4, fly: 0.6 },
  night: { sky: "#7f93e6", ground: "#46538f", hemi: 1.4, sun: "#9fb2ff", sunI: 1.3, lamp: 5.6, fire: 1, fly: 0 },
};
const LIGHTS = DOUX ? LIGHTS_DOUX : LIGHTS_TOON;

// Regroupe les maillages immobiles qui partagent une matière (et le même statut d'ombre) en un seul maillage.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    if (o.userData.noMerge) return; // le sol garde sa propre géométrie
    const vc = !!o.material.vertexColors;
    if (vc && !o.geometry.attributes.color) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const keepUv = !!o.material.map;
    for (const name of Object.keys(g.attributes)) {
      const keep = name === "position" || name === "normal" || (name === "uv" && keepUv) || (name === "color" && vc);
      if (!keep) g.deleteAttribute(name);
    }
    if (keepUv && !g.attributes.uv) return;
    const key = o.material.uuid + (o.castShadow ? "|c" : "");
    if (!groups.has(key)) groups.set(key, { material: o.material, geos: [], renderOrder: o.renderOrder, cast: o.castShadow });
    groups.get(key).geos.push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) {
    // on garde les enfants non fusionnés (ex. la lumière de la lanterne)
    const keep = o.children.filter((c) => !toRemove.includes(c));
    for (const c of keep) { o.parent.add(c); c.applyMatrix4(o.matrix); }
    o.parent?.remove(o);
  }
  for (const { material, geos, renderOrder, cast } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    if (merged) {
      const m = new THREE.Mesh(merged, material);
      m.renderOrder = renderOrder;
      m.castShadow = !!cast;
      root.add(m);
    }
  }
}

function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

// Bruit doux et peu coûteux (somme de sinus), à peu près dans [-1, 1]
const lump = (x, y, z, s) => (Math.sin(x * 2.3 + s) * Math.sin(y * 2.9 + s * 1.7) + Math.sin(z * 2.6 + s * 2.3) * Math.sin(x * 3.4 + y * 1.9 + s)) * 0.5;

// Boule organique : icosaèdre fusionné (normales lisses) dont chaque sommet est déplacé par un bruit, une fois à la création
function softBlob(r, detail, amp, seed, sy = 1) {
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = r * (1 + amp * lump(x * 1.6, y * 1.6, z * 1.6, seed));
    p.setXYZ(i, x * k, y * k * sy, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// Couleurs par sommet : multiplicateur lo (bas, en y0) vers hi (haut, en y1), fondu doux
function tint(geo, y0, y1, lo, hi) {
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const k = THREE.MathUtils.smoothstep((p.getY(i) - y0) / (y1 - y0), 0, 1);
    c[i * 3] = lo.r + (hi.r - lo.r) * k;
    c[i * 3 + 1] = lo.g + (hi.g - lo.g) * k;
    c[i * 3 + 2] = lo.b + (hi.b - lo.b) * k;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return geo;
}

// Étage de sapin arrondi (révolution d'un profil lisse), du bas vers le haut, centré sur y = 0
function tierGeo(r, h) {
  const prof = [[0, -0.1], [0.6, -0.1], [0.94, -0.06], [1, 0.02], [0.78, 0.15], [0.42, 0.42], [0.16, 0.74], [0, 1]];
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x * r, (y - 0.45) * h)), 28);
  g.deleteAttribute("uv");
  return g;
}

export function buildWorld(scene, { gradientMap, outline, shadowTexture, hemi, sun, rim = null, contact = null }) {
  const rnd = seeded(42);
  const windUniform = { value: 0 };
  let groundInfo = null, groundColors = null, tuftMat = null;
  const world = new THREE.Group();
  scene.add(world);
  // une seule matière par couleur : les objets de même couleur fusionnent ensemble
  const toonCache = new Map();
  const toon = (color, extra) => {
    const make = () => (DOUX
      ? new THREE.MeshLambertMaterial({ color, ...extra })
      : new THREE.MeshToonMaterial({ color, gradientMap, ...extra }));
    if (extra) return make();
    if (!toonCache.has(color)) toonCache.set(color, make());
    return toonCache.get(color);
  };
  // matière un peu brillante (eau) : Standard en rendu doux
  const glossy = (color, roughness) => (DOUX
    ? new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
    : toon(color, {}));
  const withOutline = (mesh) => { if (!DOUX) mesh.add(new THREE.Mesh(mesh.geometry, outline)); return mesh; };
  const cast = (mesh) => { if (DOUX) mesh.castShadow = true; return mesh; };
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: DOUX ? 0.4 : 0.8 });
  // ombre de contact : en rendu doux, seulement hors de la zone d'ombre portée (arbres lointains)
  const blobShadow = (x, z, r) => {
    if (DOUX && inShadowBox(x, z)) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    world.add(m);
  };

  // --- soleil : position et caméra d'ombre serrée autour de la zone visible (rendu doux)
  if (DOUX) {
    sun.position.set(...SUN_SHADOW.pos);
    const sc = sun.shadow.camera;
    sc.left = -SUN_SHADOW.half; sc.right = SUN_SHADOW.half; sc.top = SUN_SHADOW.half; sc.bottom = -SUN_SHADOW.half;
    sc.near = 1; sc.far = 26;
    sc.updateProjectionMatrix();
    sun.shadow.bias = SUN_SHADOW.bias;
    sun.shadow.normalBias = SUN_SHADOW.normalBias;
    sun.shadow.radius = SUN_SHADOW.radius;
  }

  // --- sol : prairie avec taches de vert, chemin de terre et collines au loin
  const pathX = (z) => 0.9 * Math.sin(z * 0.32) - 0.25;
  const pondC = new THREE.Vector2(2.4, -3.4);
  const inPond = (x, z) => ((x - pondC.x) / 1.35) ** 2 + ((z - pondC.y) / 0.75) ** 2 < 1;

  // Rendu doux : la couleur du sol est une texture (variation douce, bord du chemin fondu), repeinte au changement de palette
  const GT = 768, GX0 = -32, GZ0 = -44, GSPAN = 64; // texture 768 px sur 64 unités, de x -32..32 et z -44..20
  let gCtx = null, gImg = null, gTex = null;
  const lin2srgb = new Uint8Array(1024);
  for (let i = 0; i < 1024; i++) {
    const v = i / 1023;
    lin2srgb[i] = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  }
  const sstep = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function paintGround(th) {
    const A = new THREE.Color(th.grass[0]), B = new THREE.Color(th.grass[1]), F = new THREE.Color(th.far),
      P = new THREE.Color(th.path), E = new THREE.Color(th.pathEdge);
    const d = gImg.data;
    let o = 0;
    for (let py = 0; py < GT; py++) {
      const z = GZ0 + ((py + 0.5) / GT) * GSPAN;
      const depth = sstep(-z, 3, 30) * 0.75;
      const w = 0.55 + Math.max(0, -z) * 0.02;
      const fade = sstep(-z, 0.7, 1.9) * (1 - sstep(-z, 22, 27));
      const pc = pathX(z);
      for (let px = 0; px < GT; px++, o += 4) {
        const x = GX0 + ((px + 0.5) / GT) * GSPAN;
        const n = Math.sin(x * 0.8) * Math.sin(z * 0.7) + Math.sin(x * 0.27 + z * 0.33) * 0.8;
        const mix = Math.min(1, Math.max(0, n * 0.5 + 0.5));
        const fine = Math.sin(x * 2.3 + z * 1.9) * 0.5 + Math.sin(x * 5.1 - z * 4.3) * 0.3 + Math.sin(x * 9.7 + z * 8.3) * 0.2;
        let r = A.r + (B.r - A.r) * mix, g = A.g + (B.g - A.g) * mix, b = A.b + (B.b - A.b) * mix;
        const br = 1 + fine * 0.06;
        r *= br; g *= br; b *= br;
        const dd = Math.abs(x - pc) + fine * 0.07;
        const em = (1 - sstep(dd, w, w + 0.6)) * fade * 0.55;
        const pm = (1 - sstep(dd, w - 0.12, w + 0.22)) * fade;
        r += (E.r - r) * em; g += (E.g - g) * em; b += (E.b - b) * em;
        r += (P.r * (1 + fine * 0.05) - r) * pm; g += (P.g * (1 + fine * 0.05) - g) * pm; b += (P.b * (1 + fine * 0.05) - b) * pm;
        r += (F.r - r) * depth; g += (F.g - g) * depth; b += (F.b - b) * depth;
        d[o] = lin2srgb[Math.min(1023, (r * 1023) | 0)];
        d[o + 1] = lin2srgb[Math.min(1023, (g * 1023) | 0)];
        d[o + 2] = lin2srgb[Math.min(1023, (b * 1023) | 0)];
        d[o + 3] = 255;
      }
    }
    gCtx.putImageData(gImg, 0, 0);
    gTex.needsUpdate = true;
  }

  {
    const geo = DOUX ? new THREE.PlaneGeometry(110, 110, 110, 110) : new THREE.PlaneGeometry(110, 110, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    groundInfo = new Float32Array(pos.count * 3); // mélange des deux verts, chemin, profondeur (rendu toon)
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // collines qui ondulent au loin
      const far = THREE.MathUtils.smoothstep(-z, 7, 20);
      const y = far * ((Math.sin(x * 0.22) + Math.sin(x * 0.11 + 1.3) * 1.4 + Math.sin(z * 0.15)) * 0.9 + 1.2);
      pos.setY(i, y);
      if (DOUX) { uv.setXY(i, (x - GX0) / GSPAN, 1 - (z - GZ0) / GSPAN); continue; }
      const n = Math.sin(x * 0.8) * Math.sin(z * 0.7) + Math.sin(x * 0.27 + z * 0.33) * 0.8;
      const d = Math.abs(x - pathX(z));
      let kind = 0;
      if (z < -0.9 && z > -26) {
        const w = 0.55 + Math.max(0, -z) * 0.02;
        if (d < w) kind = 1;
        else if (d < w + 0.12) kind = 2;
      }
      groundInfo.set([THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1), kind, THREE.MathUtils.smoothstep(-z, 3, 30)], i * 3);
    }
    geo.computeVertexNormals();
    let ground;
    if (DOUX) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = GT;
      gCtx = cv.getContext("2d");
      gCtx.fillStyle = "#7cc86a"; gCtx.fillRect(0, 0, GT, GT); // en attendant la palette
      gImg = gCtx.createImageData(GT, GT);
      gTex = new THREE.CanvasTexture(cv);
      gTex.colorSpace = THREE.SRGBColorSpace;
      gTex.anisotropy = 4;
      ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: gTex }));
      ground.receiveShadow = true;
    } else {
      groundColors = new THREE.BufferAttribute(colors, 3);
      geo.setAttribute("color", groundColors);
      ground = new THREE.Mesh(geo, toon("#ffffff", { vertexColors: true }));
    }
    ground.userData.noMerge = true;
    world.add(ground);
  }

  // collines lointaines, de plus en plus bleutées
  const hillMats = [];
  [
    { x: -22, z: -42, sx: 26, sy: 9, c: "#8fd17a" },
    { x: 18, z: -46, sx: 30, sy: 11, c: "#9ccf96" },
    { x: 0, z: -58, sx: 40, sy: 14, c: "#a9cdb6" },
  ].forEach((h) => {
    const mat = toon(h.c, {});
    hillMats.push(mat);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, DOUX ? 48 : 28, DOUX ? 24 : 14), mat);
    m.scale.set(h.sx, h.sy, 10);
    m.position.set(h.x, -1, h.z);
    world.add(m);
  });

  // --- arbres
  const trunkMat = toon("#9a5f34");
  const leafMats = [toon("#27c23a", DOUX ? { vertexColors: true } : undefined), toon("#1fa83f", DOUX ? { vertexColors: true } : undefined), toon("#4ad12c", DOUX ? { vertexColors: true } : undefined)];
  const fruitMat = toon("#ff4d5e");
  // rendu toon : dessus des couronnes en calottes plus claires (deux tons). Rendu doux : dégradé par sommet, sans calottes.
  const leafLightMats = DOUX ? [] : leafMats.map(() => toon("#ffffff", {}));
  const lightenLeaf = (hex) => new THREE.Color(hex).lerp(new THREE.Color("#fff2b0"), DECOR.crownHighlight);
  leafLightMats.forEach((m, i) => m.color.copy(lightenLeaf(leafMats[i].color)));
  const pineMat = toon("#12935a", DOUX ? { vertexColors: true } : undefined);
  const hl = DECOR.crownHighlight;
  const crownLo = new THREE.Color(0.74, 0.8, 0.84), crownHi = new THREE.Color(1 + hl * 0.5, 1 + hl * 0.45, 1 - hl * 0.15);
  const pineLo = new THREE.Color(0.76, 0.82, 0.86), pineHi = new THREE.Color(1 + hl * 0.35, 1 + hl * 0.35, 1 - hl * 0.1);
  const bushLo = new THREE.Color(0.8, 0.86, 0.88), bushHi = new THREE.Color(1 + hl * 0.4, 1 + hl * 0.4, 1 - hl * 0.1);
  const CROWN = [[0, 1.55, 0, 0.78], [-0.5, 1.3, 0.1, 0.52], [0.5, 1.35, -0.05, 0.56], [0.1, 2.05, -0.1, 0.5]];
  const CROWN_DOUX = [...CROWN, [-0.18, 1.5, 0.46, 0.46], [0.28, 1.72, -0.4, 0.46]];
  function roundTree(x, z, s, k = 0) {
    const g = new THREE.Group();
    const trunk = cast(withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.1, DOUX ? 16 : 10, DOUX ? 4 : 1), trunkMat)));
    trunk.position.y = 0.55;
    g.add(trunk);
    const mat = leafMats[k % leafMats.length];
    if (DOUX) {
      // couronne : grappe de boules déformées par bruit, fondue en un seul maillage, teinte plus claire vers le haut
      const seed = rnd() * 10;
      const parts = CROWN_DOUX.map(([px, py, pz, r], i) => softBlob(r, 2, 0.14, seed + i * 1.7, 0.92).translate(px, py, pz));
      const crown = new THREE.Mesh(tint(mergeGeometries(parts), 0.95, 2.5, crownLo, crownHi), mat);
      cast(crown);
      g.add(crown);
    } else {
      CROWN.forEach(([px, py, pz, r]) => {
        const leaf = withOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat));
        leaf.position.set(px, py, pz);
        g.add(leaf);
        if (DECOR.crownHighlight > 0) {
          // calotte claire décalée vers le haut et vers la caméra (sans contour pour rester douce)
          const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 12, 9), leafLightMats[k % leafLightMats.length]);
          cap.position.set(px + r * 0.12, py + r * 0.3, pz + r * 0.22);
          g.add(cap);
        }
      });
    }
    // quelques fruits
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.08, DOUX ? 12 : 8, DOUX ? 9 : 6), fruitMat);
      fruit.position.set(Math.cos(a) * 0.62, 1.35 + rnd() * 0.5, Math.abs(Math.sin(a)) * 0.6 + 0.15);
      g.add(fruit);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    g.rotation.y = rnd() * Math.PI;
    world.add(g);
    blobShadow(x, z, 1.1 * s);
    return g;
  }
  function pine(x, z, s) {
    const g = new THREE.Group();
    const trunk = cast(withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, DOUX ? 12 : 8), trunkMat)));
    trunk.position.y = 0.3;
    g.add(trunk);
    const tiers = [[0.75, 0.9, 0.55], [0.6, 0.8, 1.05], [0.42, 0.7, 1.5]];
    if (DOUX) {
      // sapin plus doux : étages arrondis, dégradé de teinte du bas vers la pointe
      const parts = tiers.map(([r, h, y]) => tierGeo(r, h).translate(0, y, 0));
      const tree = new THREE.Mesh(tint(mergeGeometries(parts), 0.1, 1.85, pineLo, pineHi), pineMat);
      cast(tree);
      g.add(tree);
    } else {
      tiers.forEach(([r, h, y]) => {
        const cone = withOutline(new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), pineMat));
        cone.position.y = y;
        g.add(cone);
      });
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    world.add(g);
    blobShadow(x, z, 0.8 * s);
  }
  roundTree(-3.1, -5.2, 1.25, 0);
  roundTree(-5.6, -9, 1.5, 1);
  roundTree(5.4, -9.5, 1.6, 2);
  roundTree(-1.6, -13, 1.4, 2);
  pine(3.6, -6.6, 1.5);
  pine(-4.4, -7.4, 1.3);
  pine(1.2, -16, 1.8);
  pine(-7.5, -14, 2);
  pine(7.2, -15, 2.2);
  roundTree(4.4, -21, 2.2, 1);
  roundTree(-3.8, -22, 2.4, 0);

  // --- buissons avec baies
  const bushMat = toon("#2cc046", DOUX ? { vertexColors: true } : undefined);
  function bush(x, z, s) {
    const g = new THREE.Group();
    const BL = [[0, 0.32, 0, 0.42], [-0.38, 0.24, 0.05, 0.32], [0.4, 0.25, -0.02, 0.34]];
    if (DOUX) {
      const seed = rnd() * 10;
      const parts = BL.map(([px, py, pz, r], i) => softBlob(r, 2, 0.12, seed + i * 2.1, 0.9).translate(px, py, pz));
      g.add(cast(new THREE.Mesh(tint(mergeGeometries(parts), 0, 0.75, bushLo, bushHi), bushMat)));
    } else {
      BL.forEach(([px, py, pz, r]) => {
        const b = withOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), bushMat));
        b.position.set(px, py, pz);
        g.add(b);
      });
    }
    for (let i = 0; i < 5; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.05, DOUX ? 12 : 8, DOUX ? 9 : 6), toon(i % 2 ? "#ff3d7f" : "#ffffff"));
      berry.position.set(rnd() * 0.9 - 0.45, 0.25 + rnd() * 0.3, 0.3 + rnd() * 0.1);
      g.add(berry);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    world.add(g);
    blobShadow(x, z, 0.7 * s);
  }
  bush(-2.3, -1.9, 1.1);
  bush(2.6, -1.5, 0.95);
  bush(-1.2, -4.6, 0.8);
  bush(0.9, -8.5, 1.2);

  // --- champignons
  function mushroom(x, z, s) {
    const g = new THREE.Group();
    const stem = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, DOUX ? 16 : 10), toon("#fff3dc")));
    stem.position.y = 0.13;
    g.add(stem);
    const cap = cast(withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.2, DOUX ? 28 : 18, DOUX ? 16 : 12, 0, Math.PI * 2, 0, Math.PI / 2), toon("#ff3b3b"))));
    cap.position.y = 0.24;
    cap.scale.y = 0.8;
    g.add(cap);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, r = i === 4 ? 0 : 0.12;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, DOUX ? 12 : 8, DOUX ? 9 : 6), toon("#ffffff"));
      dot.position.set(Math.cos(a) * r, i === 4 ? 0.4 : 0.34, Math.sin(a) * r);
      g.add(dot);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    world.add(g);
  }
  mushroom(-1.9, 1.0, 1.1);
  mushroom(-2.2, 1.35, 0.7);
  mushroom(-1.6, 1.45, 0.55);

  // --- cailloux : galets arrondis, déformés puis lissés (rendu doux)
  const rockMat = toon(DOUX ? "#bcb2a8" : "#b8b2c8");
  [[1.8, 1.1, 0.22], [2.1, 0.8, 0.14], [-0.9, -3.0, 0.18], [1.4, -5.2, 0.2], [3.4, -3.0, 0.16], [1.6, -3.9, 0.12]].forEach(([x, z, r], i) => {
    const rock = cast(withOutline(new THREE.Mesh(DOUX ? softBlob(r, 3, 0.22, i * 3.1, 1) : new THREE.DodecahedronGeometry(r, 0), rockMat)));
    rock.position.set(x, r * 0.45, z);
    rock.scale.y = 0.65;
    rock.rotation.set(rnd(), rnd() * 3, rnd());
    world.add(rock);
  });

  // --- mare et nénuphars
  const ripples = [];
  {
    const rim = new THREE.Mesh(new THREE.CircleGeometry(1, DOUX ? 64 : 40), toon(DOUX ? "#a8ecff" : "#8fe3ff"));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(1.45, 0.85, 1);
    rim.position.set(pondC.x, 0.015, pondC.y);
    world.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, DOUX ? 64 : 40), glossy("#3aaeea", 0.18));
    water.rotation.x = -Math.PI / 2;
    water.scale.set(1.3, 0.72, 1);
    water.position.set(pondC.x, 0.02, pondC.y);
    world.add(water);
    for (let i = 0; i < DECOR.pondRipples; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color: "#e6f8ff", transparent: true, opacity: 0, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pondC.x + (i ? -0.4 : 0.2), 0.026, pondC.y + (i ? 0.1 : -0.05));
      ring.userData.dynamic = true;
      world.add(ring);
      ripples.push({ ring, phase: i / DECOR.pondRipples });
    }
    [[2.0, -3.3, 0.22], [2.75, -3.6, 0.17], [2.55, -3.1, 0.12]].forEach(([x, z, r], i) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 24, 0.3, Math.PI * 1.8), toon("#3fbf4a"));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.03, z);
      world.add(pad);
      if (i === 0) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), toon("#ff8fc8"));
        lotus.position.set(x, 0.07, z);
        world.add(lotus);
      }
    });
  }

  // --- lanterne qui s'allume le soir
  const lampGlass = new THREE.MeshBasicMaterial({ color: "#5b4a2a" });
  const lampLight = new THREE.PointLight("#ffbf5e", 0, 7, 1.6);
  {
    const g = new THREE.Group();
    const post = cast(withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, DOUX ? 12 : 8), toon("#6b4a2e"))));
    post.position.y = 0.75;
    g.add(post);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), lampGlass);
    box.position.y = 1.62;
    g.add(withOutline(box));
    const roof = cast(withOutline(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 4), toon("#3d2c1c"))));
    roof.position.y = 1.86;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    lampLight.position.y = 1.6;
    g.add(lampLight);
    g.position.set(-1.7, 0, -3.3);
    world.add(g);
    blobShadow(-1.7, -3.3, 0.35);
  }

  // --- fleurs (instances) et touffes d'herbe
  const tuftCount = DOUX ? DECOR.tuftCountDoux : DECOR.tuftCount;
  const spots = [];
  const okSpot = (x, z) =>
    Math.hypot(x, z) > 1.5 && !inPond(x, z) && !(z < -0.9 && Math.abs(x - pathX(z)) < 0.75);
  while (spots.length < DECOR.flowerCount + tuftCount) {
    const z = (DOUX ? 3.2 : 2.6) - rnd() * (DOUX ? 14 : 12);
    const x = (rnd() * 2 - 1) * (3 + (2.6 - z) * (DOUX ? 0.45 : 0.35));
    if (okSpot(x, z)) spots.push([x, z]);
  }
  {
    const seg = DOUX ? [8, 6] : [6, 4];
    const petal = new THREE.SphereGeometry(0.05, seg[0], seg[1]);
    petal.scale(1, 0.45, 1);
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(petal.clone().translate(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06));
    }
    const petals = mergeGeometries(parts);
    const centers = new THREE.SphereGeometry(0.035, seg[0], seg[1]);
    const petalMesh = new THREE.InstancedMesh(petals, toon("#ffffff"), DECOR.flowerCount);
    const centerMesh = new THREE.InstancedMesh(centers, toon("#ffd23f"), DECOR.flowerCount);
    if (DOUX) { petalMesh.receiveShadow = true; centerMesh.receiveShadow = true; }
    const palette = ["#ff8fb8", "#fff4e0", "#ffd86b", "#c6a4ff", "#ffa56b", "#8fd6ff"].map((h) => new THREE.Color(h));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < DECOR.flowerCount; i++) {
      const [x, z] = spots[i];
      const s = 0.9 + rnd() * 0.8;
      q.setFromEuler(new THREE.Euler(-0.3 + rnd() * 0.3, rnd() * 3, 0));
      m.compose(new THREE.Vector3(x, 0.14 * s, z), q, sc.set(s, s, s));
      petalMesh.setMatrixAt(i, m);
      centerMesh.setMatrixAt(i, m);
      petalMesh.setColorAt(i, palette[Math.floor(rnd() * palette.length)]);
    }
    world.add(petalMesh, centerMesh);

    let tuft;
    if (DOUX) {
      // vraies petites lames : cônes fins à 3 pans, légèrement penchés, en touffes de 4 ; dégradé base sombre -> pointe claire
      const blade = new THREE.ConeGeometry(0.02, 0.4, 3, 2, true);
      blade.deleteAttribute("uv");
      blade.translate(0, 0.2, 0);
      const mk = (sy, rx, rz, x, z) => blade.clone().scale(1, sy, 1).rotateX(rx).rotateZ(rz).translate(x, 0, z);
      tuft = mergeGeometries([
        mk(1.0, 0.1, 0.2, -0.03, 0.01), mk(1.25, -0.08, -0.12, 0.02, -0.02),
        mk(0.8, 0.22, -0.3, 0.05, 0.03), mk(1.1, -0.2, 0.28, -0.04, -0.04),
      ]);
      tint(tuft, 0, 0.5, new THREE.Color(0.5, 0.62, 0.45), new THREE.Color(1.18, 1.18, 0.86));
    } else {
      const blade = new THREE.ConeGeometry(0.035, 0.32, 4);
      blade.translate(0, 0.16, 0);
      tuft = mergeGeometries([
        blade.clone().rotateZ(0.25).translate(-0.04, 0, 0),
        blade.clone(),
        blade.clone().rotateZ(-0.3).translate(0.05, 0, 0.02),
      ]);
    }
    tuftMat = toon("#2fa83a", DOUX ? { vertexColors: true } : {});
    // balancement au vent : décalage des pointes dans le shader, déphasé selon la position de la touffe
    const bend = DOUX
      ? `position.y * position.y * ${(DECOR.windAmp / 0.4).toFixed(3)}`
      : `position.y * ${DECOR.windAmp.toFixed(2)}`;
    const bend2 = DOUX
      ? `position.y * position.y * ${(DECOR.windAmp / 0.8).toFixed(3)}`
      : `position.y * ${(DECOR.windAmp * 0.5).toFixed(2)}`;
    tuftMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = windUniform;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace("#include <begin_vertex>", `vec3 transformed = vec3(position);
#ifdef USE_INSTANCING
  vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
#else
  vec2 ip = vec2(0.0);
#endif
  float sway = sin(uTime * ${DECOR.windSpeed.toFixed(2)} + ip.x * 1.3 + ip.y * 0.9);
  transformed.x += sway * ${bend};
  transformed.z += cos(uTime * ${(DECOR.windSpeed * 0.7).toFixed(2)} + ip.y * 1.1) * ${bend2};`);
    };
    const grass = new THREE.InstancedMesh(tuft, tuftMat, Math.max(1, tuftCount));
    if (DOUX) grass.receiveShadow = true; // l'herbe prend l'ombre de la créature et des arbres comme le sol
    const tc = new THREE.Color();
    for (let i = 0; i < tuftCount; i++) {
      const [x, z] = spots[DECOR.flowerCount + i];
      const s = 0.8 + rnd() * 0.9;
      m.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), sc.set(s, s, s));
      grass.setMatrixAt(i, m);
      const v = 0.82 + rnd() * 0.32; // variation de teinte d'une touffe à l'autre
      grass.setColorAt(i, tc.setRGB(v, v * (0.96 + rnd() * 0.1), v * 0.92));
    }
    grass.count = tuftCount;
    world.add(grass);
  }

  // --- papillons (le jour)
  const butterflies = [];
  ["#ff7ab8", "#ffd23f", "#7ad7ff"].forEach((color, i) => {
    const g = new THREE.Group();
    const wingGeo = new THREE.CircleGeometry(0.11, 12);
    wingGeo.scale(1, 1.3, 1);
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true });
    const left = new THREE.Mesh(wingGeo, mat), right = new THREE.Mesh(wingGeo, mat);
    left.position.x = -0.1; right.position.x = 0.1;
    const lp = new THREE.Group(), rp = new THREE.Group();
    lp.add(left); rp.add(right);
    g.add(lp, rp);
    const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 6), new THREE.MeshBasicMaterial({ color: "#3b2210", transparent: true }));
    g.add(bodyMesh);
    g.userData.dynamic = true;
    world.add(g);
    butterflies.push({ g, lp, rp, mats: [mat, bodyMesh.material], phase: i * 2.1, r: 1.8 + i * 0.6, h: 1.2 + i * 0.35 });
  });

  // --- lucioles (la nuit)
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 64;
  {
    const c = glowCanvas.getContext("2d");
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,250,190,1)"); g.addColorStop(0.3, "rgba(255,235,120,0.8)"); g.addColorStop(1, "rgba(255,220,80,0)");
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  }
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const flies = [];
  for (let i = 0; i < 22; i++) {
    const mat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(0.28);
    const base = new THREE.Vector3((rnd() * 2 - 1) * 4, 0.3 + rnd() * 1.6, 2 - rnd() * 9);
    world.add(s);
    flies.push({ s, base, p: rnd() * 10 });
  }

  // --- nuages doux qui dérivent au fond (sprites flous, hors brouillard, derrière le décor)
  const clouds = [];
  const cloudColor = { cur: new THREE.Color("#ffffff"), target: new THREE.Color("#ffffff"), op: 0.85, opT: 0.85 };
  if (DECOR.cloudCount > 0) {
    const cc = document.createElement("canvas");
    cc.width = 256; cc.height = 96;
    const c = cc.getContext("2d");
    for (const [x, y, r] of [[70, 56, 34], [112, 44, 40], [158, 50, 38], [196, 60, 28], [130, 64, 36]]) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.6, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 256, 96);
    }
    const cloudTex = new THREE.CanvasTexture(cc);
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < DECOR.cloudCount; i++) {
      const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
      const s = new THREE.Sprite(mat);
      const w = 14 + (i % 3) * 5;
      s.scale.set(w, w * 0.375, 1);
      s.position.set(-32 + (i / DECOR.cloudCount) * 64, 11.5 + (i % 3) * 1.4, -50);
      s.renderOrder = -1;
      world.add(s);
      clouds.push(s);
    }
  }

  // --- pollen et pétales qui flottent le jour (un seul Points, positions mises à jour sans allocation)
  let pollen = null, pollenBase = null;
  if (DECOR.pollenCount > 0) {
    const n = DECOR.pollenCount;
    pollenBase = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) pollenBase.set([(rnd() * 2 - 1) * 5, 0.3 + rnd() * 2.4, 3 - rnd() * 11, rnd() * 10], i * 4);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    pollen = new THREE.Points(pg, new THREE.PointsMaterial({ color: "#fff3c4", size: 0.07, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    pollen.frustumCulled = false;
    world.add(pollen);
  }

  // --- Fusion des objets fixes : un seul appel de dessin par matière au lieu de centaines
  mergeStatic(world);

  // --- éclairage selon le moment de la journée
  // rendu doux : brouillard exponentiel (profondeur atmosphérique progressive) ; toon : linéaire 16-48
  const fog = DOUX && DECOR.fogDensity > 0
    ? new THREE.FogExp2(SKY.day.bottom, DECOR.fogDensity)
    : new THREE.Fog(SKY.day.bottom, 16, 48);
  scene.fog = fog;

  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 256; skyCanvas.height = 512;
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  let skyOverride = null;
  function drawSky(phase, dead) {
    const c = skyCanvas.getContext("2d");
    const col = (phase === "day" && skyOverride) || SKY[phase] || SKY.day;
    const g = c.createLinearGradient(0, 0, 0, 512);
    const mid = new THREE.Color(col.top).lerp(new THREE.Color(col.bottom), 0.55).getStyle();
    g.addColorStop(0, col.top); g.addColorStop(0.3, mid); g.addColorStop(0.55, col.bottom); g.addColorStop(1, col.bottom);
    c.fillStyle = g; c.fillRect(0, 0, 256, 512);
    const r = seeded(7);
    if (phase === "night") {
      c.fillStyle = "#fff";
      for (let i = 0; i < 70; i++) { c.globalAlpha = 0.4 + r() * 0.6; c.beginPath(); c.arc(r() * 256, r() * 260, 0.6 + r() * 1.2, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
      // croissant de lune
      c.fillStyle = "#fff6c9"; c.beginPath(); c.arc(196, 90, 18, 0, Math.PI * 2); c.fill();
      c.fillStyle = col.top; c.beginPath(); c.arc(206, 84, 16, 0, Math.PI * 2); c.fill();
    } else {
      const sunC = phase === "dusk" ? "#ff8a4c" : phase === "dawn" ? "#ffcf6e" : "#ffe14d";
      const glow = c.createRadialGradient(196, 120, 10, 196, 120, 70);
      glow.addColorStop(0, sunC); glow.addColorStop(0.35, sunC + "aa"); glow.addColorStop(1, sunC + "00");
      c.fillStyle = glow; c.fillRect(110, 40, 180, 170);
      c.fillStyle = sunC; c.beginPath(); c.arc(196, 120, 22, 0, Math.PI * 2); c.fill();
    }
    // quelques nuages ronds
    c.fillStyle = phase === "night" ? "rgba(150,165,240,.25)" : phase === "dusk" ? "rgba(255,210,195,.9)" : "rgba(255,255,255,.95)";
    for (const [x, y, s] of [[50, 150, 1], [150, 210, 0.75], [230, 175, 0.6]]) {
      c.beginPath();
      c.ellipse(x, y, 34 * s, 11 * s, 0, 0, Math.PI * 2);
      c.ellipse(x - 10 * s, y - 9 * s, 15 * s, 13 * s, 0, 0, Math.PI * 2);
      c.ellipse(x + 10 * s, y - 12 * s, 18 * s, 16 * s, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (dead) { c.fillStyle = "rgba(120,120,130,.45)"; c.fillRect(0, 0, 256, 512); }
    skyTex.needsUpdate = true;
  }
  const cur = { sky: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), rim: new THREE.Color(), fog: new THREE.Color(SKY.day.bottom), hemi: 1.25, sunI: 2.7, rimI: 0, lamp: 0, fire: 0, fly: 1 };
  const target = { ...cur, sky: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), rim: new THREE.Color(), fog: new THREE.Color() };
  const GREY = new THREE.Color("#b9b6c4");
  let lastPhase = { phase: "day", opts: {} };
  function setPhase(phase, opts = {}) {
    const { dead = false, sky = null } = opts;
    lastPhase = { phase, opts };
    skyOverride = sky;
    drawSky(phase, dead);
    if (USE_STUDIO) drawStudio(phase, dead);
    const L = (view === "studio" ? LIGHTS_STUDIO[phase] || LIGHTS_STUDIO.day : LIGHTS[phase] || LIGHTS.day);
    target.sky.set(L.sky); target.ground.set(L.ground); target.sun.set(L.sun); target.rim.set(L.rim || "#ffffff");
    target.rimI = L.rim ? L.rimI : 0;
    target.fog.set(((phase === "day" && sky) || SKY[phase] || SKY.day).bottom);
    if (dead) { target.sky.lerp(GREY, 0.7); target.sun.lerp(GREY, 0.7); }
    cloudColor.target.set(phase === "night" ? "#8f9ad8" : phase === "dusk" ? "#ffc9bd" : phase === "dawn" ? "#ffe3d2" : "#ffffff");
    cloudColor.opT = phase === "night" ? 0.35 : 0.85;
    Object.assign(target, { hemi: L.hemi, sunI: L.sunI, lamp: L.lamp, fire: L.fire, fly: L.fly });
  }
  // --- Vue studio : fond en dégradé doux (sans horizon), sol invisible qui ne montre que l'ombre, bascule studio <-> prairie
  let view = USE_STUDIO ? "studio" : "pre";
  const studioCanvas = document.createElement("canvas");
  studioCanvas.width = 256; studioCanvas.height = 512;
  const studioTex = new THREE.CanvasTexture(studioCanvas);
  studioTex.colorSpace = THREE.SRGBColorSpace;
  const focus = { x: 0.5, y: 0.52 }; // centre du halo (fraction de l'écran) : là où se tient la créature
  function drawStudio(phase, dead) {
    const c = studioCanvas.getContext("2d");
    const col = STUDIO_BG[phase] || STUDIO_BG.day;
    const g = c.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, col.top); g.addColorStop(0.5, col.mid); g.addColorStop(1, col.bot);
    c.fillStyle = g; c.fillRect(0, 0, 256, 512);
    const night = phase === "night";
    if (STUDIO.halo > 0) {
      const cx = focus.x * 256, cy = focus.y * 512, k = STUDIO.halo * (night ? 0.5 : 1);
      const h = c.createRadialGradient(cx, cy, 0, cx, cy, 250);
      h.addColorStop(0, `rgba(255,255,255,${k})`); h.addColorStop(0.5, `rgba(255,255,255,${k * 0.32})`); h.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = h; c.fillRect(0, 0, 256, 512);
    }
    if (STUDIO.vignette > 0) {
      const v = c.createRadialGradient(128, 250, 140, 128, 250, 340);
      v.addColorStop(0, "rgba(10,30,90,0)"); v.addColorStop(1, `rgba(10,30,90,${STUDIO.vignette})`);
      c.fillStyle = v; c.fillRect(0, 0, 256, 512);
    }
    if (dead) { c.fillStyle = "rgba(120,120,130,.45)"; c.fillRect(0, 0, 256, 512); }
    // grain très léger : évite les bandes visibles dans un dégradé aussi doux
    const img = c.getImageData(0, 0, 256, 512), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.imul(i, 2654435761) >>> 24) / 255 * 3 - 1.5;
      d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    c.putImageData(img, 0, 0);
    studioTex.needsUpdate = true;
  }
  // sol invisible : ne dessine que l'ombre portée de la créature (ShadowMaterial), aucun horizon
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ color: "#16306a", opacity: STUDIO.floorShadow, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.006;
  floor.receiveShadow = true;
  floor.visible = false;
  scene.add(floor);
  // --- Vue terrain (foot) : un grand disque d'herbe tondue à bandes, aux couleurs de la palette
  const TERRAIN_FOG = 0.03; // un peu plus dense que la prairie : le bord du disque se fond dans le ciel
  const pitchCanvas = document.createElement("canvas");
  pitchCanvas.width = 4; pitchCanvas.height = 64;
  const pitchTex = new THREE.CanvasTexture(pitchCanvas);
  pitchTex.colorSpace = THREE.SRGBColorSpace;
  pitchTex.wrapS = pitchTex.wrapT = THREE.RepeatWrapping;
  pitchTex.repeat.set(1, 20); // bandes d'environ 3 unités
  function paintPitch(th) {
    const c = pitchCanvas.getContext("2d");
    const a = new THREE.Color(th?.grass?.[0] || "#62c43c");
    c.fillStyle = a.getStyle(); c.fillRect(0, 0, 4, 32);
    c.fillStyle = a.clone().offsetHSL(0, 0, 0.05).getStyle(); c.fillRect(0, 32, 4, 32);
    pitchTex.needsUpdate = true;
  }
  paintPitch(null);
  const pitchGeo = new THREE.CircleGeometry(60, 64);
  pitchGeo.rotateX(-Math.PI / 2);
  const pitch = new THREE.Mesh(pitchGeo, toon("#ffffff", { map: pitchTex }));
  pitch.receiveShadow = DOUX;
  pitch.visible = false;
  scene.add(pitch);
  function snapLights() {
    cur.sky.copy(target.sky); cur.ground.copy(target.ground); cur.sun.copy(target.sun); cur.rim.copy(target.rim);
    for (const key of ["hemi", "sunI", "rimI", "lamp", "fire", "fly"]) cur[key] = target[key];
  }
  function applyView() {
    const st = view === "studio";
    world.visible = view === "pre";
    pitch.visible = view === "terrain";
    floor.visible = st;
    scene.background = st ? studioTex : skyTex;
    // densité 0 : la matière garde son shader (pas de recompilation)
    if (fog.isFogExp2) fog.density = st ? 0 : view === "terrain" ? TERRAIN_FOG : DECOR.fogDensity;
    if (DOUX) {
      const sc = sun.shadow.camera;
      if (st) {
        sun.position.set(...STUDIO.sunPos);
        sc.left = -STUDIO.shadowHalf; sc.right = STUDIO.shadowHalf; sc.top = STUDIO.shadowHalf; sc.bottom = -STUDIO.shadowHalf;
        sc.near = 1; sc.far = 18;
        sun.shadow.radius = 5; sun.shadow.normalBias = 0.02;
      } else {
        sun.position.set(...SUN_SHADOW.pos);
        sc.left = -SUN_SHADOW.half; sc.right = SUN_SHADOW.half; sc.top = SUN_SHADOW.half; sc.bottom = -SUN_SHADOW.half;
        sc.near = 1; sc.far = 26;
        sun.shadow.radius = SUN_SHADOW.radius; sun.shadow.normalBias = SUN_SHADOW.normalBias;
      }
      sc.updateProjectionMatrix();
    }
    if (contact) {
      contact.material.color.set(st ? STUDIO.contactTint : "#ffffff");
      contact.material.opacity = st ? STUDIO.contactShadow : 0.5;
    }
  }
  // "studio", "pre" ou "terrain" ; studio et terrain seulement si la vue studio est active (HOME_VIEW).
  // Les lumières sautent tout de suite à leur cible.
  function setView(next) {
    const v = USE_STUDIO && (next === "studio" || next === "terrain") ? next : "pre";
    if (v === view) return;
    view = v;
    applyView();
    setPhase(lastPhase.phase, lastPhase.opts);
    snapLights();
  }
  // centre du halo derrière la créature (fractions de l'écran)
  function setFocus(fx, fy) {
    if (!USE_STUDIO || (Math.abs(fx - focus.x) < 0.01 && Math.abs(fy - focus.y) < 0.01)) return;
    focus.x = fx; focus.y = fy;
    drawStudio(lastPhase.phase, !!lastPhase.opts.dead);
  }
  setPhase("day");
  snapLights();
  applyView();

  // Couleurs du décor (palette) : herbe proche, herbe au loin, chemin, feuillages, collines
  let currentTheme = null;
  function setTheme(th) {
    if (!th || th === currentTheme) return;
    currentTheme = th;
    paintPitch(th);
    if (DOUX) paintGround(th);
    else {
      const a = new THREE.Color(th.grass[0]), b = new THREE.Color(th.grass[1]), far = new THREE.Color(th.far),
        path = new THREE.Color(th.path), edge = new THREE.Color(th.pathEdge), c = new THREE.Color();
      for (let i = 0; i < groundColors.count; i++) {
        const mix = groundInfo[i * 3], kind = groundInfo[i * 3 + 1], depth = groundInfo[i * 3 + 2];
        if (kind === 1) c.copy(path);
        else if (kind === 2) c.copy(edge);
        else c.copy(a).lerp(b, mix);
        c.lerp(far, depth * 0.75); // plus clair et plus doré au loin
        groundColors.setXYZ(i, c.r, c.g, c.b);
      }
      groundColors.needsUpdate = true;
    }
    leafMats.forEach((m, i) => { m.color.set(th.leaves[i]); leafLightMats[i]?.color.copy(lightenLeaf(th.leaves[i])); });
    pineMat.color.set(th.pine);
    bushMat.color.set(th.bush);
    tuftMat.color.set(th.tuft);
    hillMats.forEach((m, i) => m.color.set(th.hills[i]));
  }

  function update(dt, t) {
    const k = Math.min(1, dt * 1.5);
    cur.sky.lerp(target.sky, k); cur.ground.lerp(target.ground, k); cur.sun.lerp(target.sun, k); cur.fog.lerp(target.fog, k);
    cur.rim.lerp(target.rim, k);
    for (const key of ["hemi", "sunI", "rimI", "lamp", "fire", "fly"]) cur[key] += (target[key] - cur[key]) * k;
    hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.hemi;
    sun.color.copy(cur.sun); sun.intensity = cur.sunI;
    if (rim) { rim.color.copy(cur.rim); rim.intensity = cur.rimI; }
    if (view === "studio") return; // studio : ni vent, ni nuages, ni papillons à animer
    fog.color.copy(cur.fog);
    if (view === "terrain") return; // terrain : la prairie est cachée, rien d'autre à animer
    lampLight.intensity = cur.lamp;
    lampGlass.color.setRGB(0.36 + cur.lamp * 0.09, 0.29 + cur.lamp * 0.08, 0.16 + cur.lamp * 0.04);

    windUniform.value = t;
    cloudColor.cur.lerp(cloudColor.target, k); cloudColor.op += (cloudColor.opT - cloudColor.op) * k;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.position.x += dt * DECOR.cloudSpeed * (0.6 + (i % 3) * 0.3);
      if (c.position.x > 38) c.position.x = -38; // reboucle hors champ
      c.material.color.copy(cloudColor.cur); c.material.opacity = cloudColor.op;
    }
    for (const r of ripples) {
      const ph = (t * 0.22 + r.phase) % 1;
      r.ring.scale.set(1.15 * (0.25 + ph * 0.9), 0.62 * (0.25 + ph * 0.9), 1);
      r.ring.material.opacity = (1 - ph) * (1 - ph) * 0.5;
    }
    if (pollen) {
      const arr = pollen.geometry.attributes.position.array, n = DECOR.pollenCount;
      for (let i = 0; i < n; i++) {
        const o = i * 4, p = pollenBase[o + 3];
        arr[i * 3] = pollenBase[o] + Math.sin(t * 0.3 + p) * 0.8;
        arr[i * 3 + 1] = pollenBase[o + 1] + Math.sin(t * 0.6 + p * 2) * 0.25;
        arr[i * 3 + 2] = pollenBase[o + 2] + Math.cos(t * 0.25 + p) * 0.6;
      }
      pollen.geometry.attributes.position.needsUpdate = true;
      pollen.material.opacity = cur.fly * 0.75;
      pollen.visible = cur.fly > 0.02;
    }
    for (const b of butterflies) {
      const a = t * 0.45 + b.phase;
      b.g.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 1.7 + b.phase) * 0.25, -1.5 + Math.sin(a * 1.3) * 1.6);
      b.g.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 18 + b.phase) * 0.9;
      b.lp.rotation.y = flap; b.rp.rotation.y = -flap;
      b.mats.forEach((m) => (m.opacity = cur.fly));
      b.g.visible = cur.fly > 0.02;
    }
    for (const f of flies) {
      f.s.position.set(f.base.x + Math.sin(t * 0.5 + f.p) * 0.5, f.base.y + Math.sin(t * 0.8 + f.p * 2) * 0.3, f.base.z + Math.cos(t * 0.4 + f.p) * 0.5);
      f.s.material.opacity = cur.fire * (0.45 + 0.55 * Math.max(0, Math.sin(t * 2 + f.p * 3)));
      f.s.visible = cur.fire > 0.02; // invisibles le jour : on ne les dessine pas
    }
  }

  return { setPhase, setTheme, update, setView, setFocus, getView: () => view };
}
