import { reactive } from "vue";

// Forme courante de l'onglet de la barre du bas, en coordonnées écran, pour que les panneaux
// au-dessus puissent l'épouser. Écrit par BottomNav, lu par StatsStrip.
// x : centre de la bulle active ; top : haut de la barre (hors onglet) ; bh : hauteur de l'onglet ;
// l / r : étendue de l'onglet à gauche / à droite de x (pieds compris) ; s : largeur d'un flanc.
export const navOrb = reactive({ on: false, x: 0, top: 0, bh: 0, l: 0, r: 0, s: 1 });

// flanc d'onglet arrondi, à d px du pied : raccord creux en bas (rayon f), coin bombé en haut (rayon R),
// court bord droit entre les deux ; tout se réduit en proportion si l'onglet s'aplatit
function edge(d, s, bh) {
  if (d <= 0) return 0;
  const k = Math.min(1, bh / s);
  const f = s * (6 / 28) * k;
  const R = s * (22 / 28) * k;
  if (d < f) return f - Math.sqrt(f * f - d * d);
  if (d >= s) return bh;
  if (d <= s - R) return d < f + 0.5 ? f : bh - R; // bord droit
  const u = s - d;
  return bh - R + Math.sqrt(R * R - u * u);
}

// hauteur d'un onglet (centre cx, étendues l/r, flancs s) à l'abscisse px
export function tabHeight(px, cx, l, r, bh, s) {
  return Math.min(edge(px - (cx - l), s, bh), edge(cx + r - px, s, bh));
}

// hauteur de l'onglet à l'abscisse écran px (0 loin de lui) ; pad l'élargit d'autant de chaque côté
export function navBumpAt(px, pad = 0) {
  if (!navOrb.on) return 0;
  return tabHeight(px, navOrb.x, navOrb.l + pad, navOrb.r + pad, navOrb.bh, navOrb.s);
}
