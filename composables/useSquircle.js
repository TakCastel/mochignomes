// Coins « squircle » (courbure continue, comme les icônes iOS).
// Le CSS ne sait pas encore le faire partout : on calcule le contour et on
// l'applique en clip-path, recalculé quand l'élément change de taille.
import { onBeforeUnmount, onMounted } from "vue";

const rad = (deg) => (deg * Math.PI) / 180;

// Contour d'un rectangle w×h aux coins continus (rayon r, lissage s entre 0 et 1)
export function squirclePath(w, h, r, s = 0.6) {
  const budget = Math.min(w, h) / 2;
  r = Math.min(r, budget);
  const p = Math.min((1 + s) * r, budget);
  const arcMeasure = 90 * (1 - s);
  const l = Math.sin(rad(arcMeasure / 2)) * r * Math.SQRT2;
  const alpha = (90 - arcMeasure) / 2;
  const p3ToP4 = r * Math.tan(rad(alpha / 2));
  const beta = 45 * s;
  const c = p3ToP4 * Math.cos(rad(beta));
  const d = c * Math.tan(rad(beta));
  const b = (p - l - c - d) / 3;
  const a = 2 * b;
  const f = (n) => Math.round(n * 100) / 100;
  const [A, B, C, D, L, R] = [a, b, c, d, l, r].map(f);
  return [
    `M ${f(w - p)} 0`,
    `c ${A} 0 ${f(a + b)} 0 ${f(a + b + c)} ${D} a ${R} ${R} 0 0 1 ${L} ${L} c ${D} ${C} ${D} ${f(b + c)} ${D} ${f(a + b + c)}`,
    `L ${w} ${f(h - p)}`,
    `c 0 ${A} 0 ${f(a + b)} ${-D} ${f(a + b + c)} a ${R} ${R} 0 0 1 ${-L} ${L} c ${-C} ${D} ${f(-(b + c))} ${D} ${f(-(a + b + c))} ${D}`,
    `L ${f(p)} ${h}`,
    `c ${-A} 0 ${f(-(a + b))} 0 ${f(-(a + b + c))} ${-D} a ${R} ${R} 0 0 1 ${-L} ${-L} c ${-D} ${-C} ${-D} ${f(-(b + c))} ${-D} ${f(-(a + b + c))}`,
    `L 0 ${f(p)}`,
    `c 0 ${-A} 0 ${f(-(a + b))} ${D} ${f(-(a + b + c))} a ${R} ${R} 0 0 1 ${L} ${-L} c ${C} ${-D} ${f(b + c)} ${-D} ${f(a + b + c)} ${-D}`,
    "Z",
  ].join(" ");
}

// Applique la découpe squircle à chaque élément donné ; radius(w, h) donne le rayon
export function useSquircle(refs, radius, smoothing = 0.7) {
  let ro = null;
  const apply = (el) => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    el.style.clipPath = `path('${squirclePath(w, h, radius(w, h), smoothing)}')`;
  };
  onMounted(() => {
    const els = refs.map((r) => r.value).filter(Boolean);
    ro = new ResizeObserver((entries) => entries.forEach((e) => apply(e.target)));
    els.forEach((el) => { apply(el); ro.observe(el); });
  });
  onBeforeUnmount(() => ro?.disconnect());
}
