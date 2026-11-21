import { reactive } from "vue";

// Forme courante de l'onglet de la barre du bas, en coordonnées écran, pour que les panneaux
// au-dessus puissent l'épouser. Écrit par BottomNav, lu par StatsStrip.
// x : centre du bouton actif ; top : haut de la barre (hors onglet) ; bh : hauteur de l'onglet ;
// l / r : étendue de l'onglet à gauche / à droite de x (pieds compris) ; s : largeur d'un flanc.
export const navOrb = reactive({ on: false, x: 0, top: 0, bh: 0, l: 0, r: 0, s: 1 });

// flanc d'onglet : presque droit, coins juste adoucis (smoothstep)
function edge(d, s) {
  const t = Math.min(1, Math.max(0, d / s));
  return t * t * (3 - 2 * t);
}

// hauteur d'un onglet (centre cx, étendues l/r, flancs s) à l'abscisse px
export function tabHeight(px, cx, l, r, bh, s) {
  return bh * edge(px - (cx - l), s) * edge(cx + r - px, s);
}

// hauteur de l'onglet à l'abscisse écran px (0 loin de lui) ; pad l'élargit d'autant de chaque côté
export function navBumpAt(px, pad = 0) {
  if (!navOrb.on) return 0;
  return tabHeight(px, navOrb.x, navOrb.l + pad, navOrb.r + pad, navOrb.bh, navOrb.s);
}
