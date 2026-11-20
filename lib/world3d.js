// lib/world3d.js
// Le décor 3D autour de la créature : prairie, chemin, arbres, mare, lanterne,
// fleurs, papillons le jour et lucioles la nuit. Même style « toon » que le personnage.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { SKY } from "./gameUi.js";

// Éclairage par moment de la journée
const LIGHTS = {
  dawn: { sky: "#ffcfb3", ground: "#b8744a", hemi: 0.95, sun: "#ffad7a", sunI: 2.9, lamp: 0, fire: 0, fly: 1 },
  day: { sky: "#e8f4ff", ground: "#c98a4a", hemi: 0.95, sun: "#ffe7b0", sunI: 3.2, lamp: 0, fire: 0, fly: 1 },
  dusk: { sky: "#c79bff", ground: "#a2603e", hemi: 0.9, sun: "#ff8a4f", sunI: 2.7, lamp: 2.5, fire: 0.4, fly: 0.6 },
  night: { sky: "#8a9cff", ground: "#4a4f8a", hemi: 1.05, sun: "#b4c2ff", sunI: 1.5, lamp: 4, fire: 1, fly: 0 },
};

// Regroupe les maillages immobiles qui partagent une matière en un seul maillage.
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    if (o.geometry.attributes.color) return; // le sol garde ses couleurs par sommet
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) return;
    const key = o.material.uuid;
    if (!groups.has(key)) groups.set(key, { material: o.material, geos: [], renderOrder: o.renderOrder });
    groups.get(key).geos.push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) {
    // on garde les enfants non fusionnés (ex. la lumière de la lanterne)
    const keep = o.children.filter((c) => !toRemove.includes(c));
    for (const c of keep) { o.parent.add(c); c.applyMatrix4(o.matrix); }
    o.parent?.remove(o);
  }
  for (const { material, geos } of groups.values()) {
    const merged = mergeGeometries(geos, false);
    if (merged) root.add(new THREE.Mesh(merged, material));
  }
}

function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

export function buildWorld(scene, { gradientMap, outline, shadowTexture, hemi, sun }) {
  const rnd = seeded(42);
  const world = new THREE.Group();
  scene.add(world);
  // une seule matière par couleur : les objets de même couleur fusionnent ensemble
  const toonCache = new Map();
  const toon = (color, extra) => {
    if (extra) return new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
    if (!toonCache.has(color)) toonCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap }));
    return toonCache.get(color);
  };
  const withOutline = (mesh) => { mesh.add(new THREE.Mesh(mesh.geometry, outline)); return mesh; };
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.8 });
  const blobShadow = (x, z, r) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    world.add(m);
  };

  // --- sol : prairie avec taches de vert, chemin de terre et collines au loin
  const pathX = (z) => 0.9 * Math.sin(z * 0.32) - 0.25;
  const pondC = new THREE.Vector2(2.4, -3.4);
  const inPond = (x, z) => ((x - pondC.x) / 1.35) ** 2 + ((z - pondC.y) / 0.75) ** 2 < 1;
  {
    const geo = new THREE.PlaneGeometry(110, 110, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cA = new THREE.Color("#4cd323"), cB = new THREE.Color("#2aa818"), cPath = new THREE.Color("#f0c987"),
      cPathEdge = new THREE.Color("#d9a75f"), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // collines qui ondulent au loin
      const far = THREE.MathUtils.smoothstep(-z, 7, 20);
      const y = far * ((Math.sin(x * 0.22) + Math.sin(x * 0.11 + 1.3) * 1.4 + Math.sin(z * 0.15)) * 0.9 + 1.2);
      pos.setY(i, y);
      const n = Math.sin(x * 0.8) * Math.sin(z * 0.7) + Math.sin(x * 0.27 + z * 0.33) * 0.8;
      c.copy(cA).lerp(cB, THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1));
      const d = Math.abs(x - pathX(z));
      if (z < -0.9 && z > -26) {
        const w = 0.55 + Math.max(0, -z) * 0.02;
        if (d < w) c.copy(cPath);
        else if (d < w + 0.12) c.copy(cPathEdge);
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    world.add(new THREE.Mesh(geo, toon("#ffffff", { vertexColors: true })));
  }

  // collines lointaines, de plus en plus bleutées
  [
    { x: -22, z: -42, sx: 26, sy: 9, c: "#8fd17a" },
    { x: 18, z: -46, sx: 30, sy: 11, c: "#9ccf96" },
    { x: 0, z: -58, sx: 40, sy: 14, c: "#a9cdb6" },
  ].forEach((h) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), toon(h.c));
    m.scale.set(h.sx, h.sy, 10);
    m.position.set(h.x, -1, h.z);
    world.add(m);
  });

  // --- arbres
  const trunkMat = toon("#9a5f34");
  const leafMats = [toon("#27c23a"), toon("#1fa83f"), toon("#4ad12c")];
  const fruitMat = toon("#ff4d5e");
  const pineMat = toon("#12935a");
  function roundTree(x, z, s, k = 0) {
    const g = new THREE.Group();
    const trunk = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 1.1, 10), trunkMat));
    trunk.position.y = 0.55;
    g.add(trunk);
    const mat = leafMats[k % leafMats.length];
    [[0, 1.55, 0, 0.78], [-0.5, 1.3, 0.1, 0.52], [0.5, 1.35, -0.05, 0.56], [0.1, 2.05, -0.1, 0.5]].forEach(([px, py, pz, r]) => {
      const leaf = withOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat));
      leaf.position.set(px, py, pz);
      g.add(leaf);
    });
    // quelques fruits
    for (let i = 0; i < 4; i++) {
      const a = rnd() * Math.PI * 2;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), fruitMat);
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
    const trunk = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8), trunkMat));
    trunk.position.y = 0.3;
    g.add(trunk);
    [[0.75, 0.9, 0.55], [0.6, 0.8, 1.05], [0.42, 0.7, 1.5]].forEach(([r, h, y]) => {
      const cone = withOutline(new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), pineMat));
      cone.position.y = y;
      g.add(cone);
    });
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
  const bushMat = toon("#2cc046");
  function bush(x, z, s) {
    const g = new THREE.Group();
    [[0, 0.32, 0, 0.42], [-0.38, 0.24, 0.05, 0.32], [0.4, 0.25, -0.02, 0.34]].forEach(([px, py, pz, r]) => {
      const b = withOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), bushMat));
      b.position.set(px, py, pz);
      g.add(b);
    });
    for (let i = 0; i < 5; i++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon(i % 2 ? "#ff3d7f" : "#ffffff"));
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
    const stem = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 10), toon("#fff3dc")));
    stem.position.y = 0.13;
    g.add(stem);
    const cap = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon("#ff3b3b")));
    cap.position.y = 0.24;
    cap.scale.y = 0.8;
    g.add(cap);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, r = i === 4 ? 0 : 0.12;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon("#ffffff"));
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

  // --- cailloux
  const rockMat = toon("#b8b2c8");
  [[1.8, 1.1, 0.22], [2.1, 0.8, 0.14], [-0.9, -3.0, 0.18], [1.4, -5.2, 0.2], [3.4, -3.0, 0.16], [1.6, -3.9, 0.12]].forEach(([x, z, r]) => {
    const rock = withOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat));
    rock.position.set(x, r * 0.45, z);
    rock.scale.y = 0.65;
    rock.rotation.set(rnd(), rnd() * 3, rnd());
    world.add(rock);
  });

  // --- mare et nénuphars
  {
    const rim = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toon("#8fe3ff"));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(1.45, 0.85, 1);
    rim.position.set(pondC.x, 0.015, pondC.y);
    world.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), toon("#2ea8f0"));
    water.rotation.x = -Math.PI / 2;
    water.scale.set(1.3, 0.72, 1);
    water.position.set(pondC.x, 0.02, pondC.y);
    world.add(water);
    [[2.0, -3.3, 0.22], [2.75, -3.6, 0.17], [2.55, -3.1, 0.12]].forEach(([x, z, r], i) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(r, 16, 0.3, Math.PI * 1.8), toon("#3fbf4a"));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(x, 0.03, z);
      world.add(pad);
      if (i === 0) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon("#ff8fc8"));
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
    const post = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), toon("#6b4a2e")));
    post.position.y = 0.75;
    g.add(post);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.26), lampGlass);
    box.position.y = 1.62;
    g.add(withOutline(box));
    const roof = withOutline(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 4), toon("#3d2c1c")));
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
  const spots = [];
  const okSpot = (x, z) =>
    Math.hypot(x, z) > 1.5 && !inPond(x, z) && !(z < -0.9 && Math.abs(x - pathX(z)) < 0.75);
  while (spots.length < 140) {
    const z = 2.6 - rnd() * 12;
    const x = (rnd() * 2 - 1) * (3 + (2.6 - z) * 0.35);
    if (okSpot(x, z)) spots.push([x, z]);
  }
  {
    const petal = new THREE.SphereGeometry(0.05, 6, 4);
    petal.scale(1, 0.45, 1);
    const parts = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(petal.clone().translate(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06));
    }
    const petals = mergeGeometries(parts);
    const centers = new THREE.SphereGeometry(0.035, 6, 4);
    const petalMesh = new THREE.InstancedMesh(petals, toon("#ffffff"), 70);
    const centerMesh = new THREE.InstancedMesh(centers, toon("#ffd23f"), 70);
    const palette = ["#ff6fa8", "#ffffff", "#ffd23f", "#b98cff", "#ff8a3d", "#5ec8ff"].map((h) => new THREE.Color(h));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < 70; i++) {
      const [x, z] = spots[i];
      const s = 0.9 + rnd() * 0.8;
      q.setFromEuler(new THREE.Euler(-0.3 + rnd() * 0.3, rnd() * 3, 0));
      m.compose(new THREE.Vector3(x, 0.14 * s, z), q, sc.set(s, s, s));
      petalMesh.setMatrixAt(i, m);
      centerMesh.setMatrixAt(i, m);
      petalMesh.setColorAt(i, palette[Math.floor(rnd() * palette.length)]);
    }
    world.add(petalMesh, centerMesh);

    const blade = new THREE.ConeGeometry(0.035, 0.32, 4);
    blade.translate(0, 0.16, 0);
    const tuft = mergeGeometries([
      blade.clone().rotateZ(0.25).translate(-0.04, 0, 0),
      blade.clone(),
      blade.clone().rotateZ(-0.3).translate(0.05, 0, 0.02),
    ]);
    const grass = new THREE.InstancedMesh(tuft, toon("#2fa83a"), 70);
    for (let i = 0; i < 70; i++) {
      const [x, z] = spots[70 + i];
      const s = 0.8 + rnd() * 0.9;
      m.compose(new THREE.Vector3(x, 0, z), q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0)), sc.set(s, s, s));
      grass.setMatrixAt(i, m);
    }
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

  // --- Fusion des objets fixes : un seul appel de dessin par matière au lieu de centaines
  mergeStatic(world);

  // --- éclairage selon le moment de la journée
  const fog = new THREE.Fog(SKY.day.bottom, 16, 48);
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
    g.addColorStop(0, col.top); g.addColorStop(0.55, col.bottom); g.addColorStop(1, col.bottom);
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
      const sun = phase === "dusk" ? "#ff8a4c" : phase === "dawn" ? "#ffcf6e" : "#ffe14d";
      const glow = c.createRadialGradient(196, 120, 10, 196, 120, 70);
      glow.addColorStop(0, sun); glow.addColorStop(0.35, sun + "aa"); glow.addColorStop(1, sun + "00");
      c.fillStyle = glow; c.fillRect(110, 40, 180, 170);
      c.fillStyle = sun; c.beginPath(); c.arc(196, 120, 22, 0, Math.PI * 2); c.fill();
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
  const cur = { sky: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), fog: new THREE.Color(SKY.day.bottom), hemi: 1.25, sunI: 2.7, lamp: 0, fire: 0, fly: 1 };
  const target = { ...cur, sky: new THREE.Color(), ground: new THREE.Color(), sun: new THREE.Color(), fog: new THREE.Color() };
  const GREY = new THREE.Color("#b9b6c4");
  function setPhase(phase, { dead = false, sky = null } = {}) {
    skyOverride = sky;
    drawSky(phase, dead);
    const L = LIGHTS[phase] || LIGHTS.day;
    target.sky.set(L.sky); target.ground.set(L.ground); target.sun.set(L.sun);
    target.fog.set(((phase === "day" && sky) || SKY[phase] || SKY.day).bottom);
    if (dead) { target.sky.lerp(GREY, 0.7); target.sun.lerp(GREY, 0.7); }
    Object.assign(target, { hemi: L.hemi, sunI: L.sunI, lamp: L.lamp, fire: L.fire, fly: L.fly });
  }
  setPhase("day");
  cur.sky.copy(target.sky); cur.ground.copy(target.ground); cur.sun.copy(target.sun);

  function update(dt, t) {
    const k = Math.min(1, dt * 1.5);
    cur.sky.lerp(target.sky, k); cur.ground.lerp(target.ground, k); cur.sun.lerp(target.sun, k); cur.fog.lerp(target.fog, k);
    for (const key of ["hemi", "sunI", "lamp", "fire", "fly"]) cur[key] += (target[key] - cur[key]) * k;
    hemi.color.copy(cur.sky); hemi.groundColor.copy(cur.ground); hemi.intensity = cur.hemi;
    sun.color.copy(cur.sun); sun.intensity = cur.sunI;
    fog.color.copy(cur.fog);
    lampLight.intensity = cur.lamp;
    lampGlass.color.setRGB(0.36 + cur.lamp * 0.09, 0.29 + cur.lamp * 0.08, 0.16 + cur.lamp * 0.04);

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

  return { setPhase, update };
}
