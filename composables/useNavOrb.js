import { reactive } from "vue";

// Forme courante de l'onglet de la barre du bas, en coordonnées écran, pour que les panneaux
// au-dessus puissent l'épouser. Écrit par BottomNav, lu par StatsStrip.
// x : centre du bouton actif ; top : haut de la barre (hors onglet) ; bh : hauteur de l'onglet ;
// l / r : étendue de l'onglet à gauche / à droite de x (pieds compris) ;
// f : largeur du raccord creux au pied ; R : rayon du coin bombé en haut.
export const navOrb = reactive({ on: false, x: 0, top: 0, bh: 0, l: 0, r: 0, f: 6, R: 22 });

// flanc d'onglet arrondi, à d px du pied : raccord creux en bas (rayon f), court bord droit,
// coin bombé en haut (rayon R). Onglet trop bas pour les deux : le raccord rétrécit d'abord
// (le coin reste concentrique à celui du bouton), puis le coin.
function edge(d, f, R, bh) {
  if (d <= 0) return 0;
  if (R > bh) {
    R = bh;
    f = 0;
  } else f = Math.min(f, bh - R);
  const s = f + R;
  if (d >= s) return bh;
  if (d < f) return f - Math.sqrt(f * f - d * d);
  if (d < s - R) return bh - R;
  const u = s - d;
  return bh - R + Math.sqrt(Math.max(0, R * R - u * u));
}

// hauteur d'un onglet (centre cx, étendues l/r, raccord f, coin R) à l'abscisse px
export function tabHeight(px, cx, l, r, bh, f, R) {
  return Math.min(edge(px - (cx - l), f, R, bh), edge(cx + r - px, f, R, bh));
}

// hauteur de l'onglet à l'abscisse écran px (0 loin de lui) ; pad l'élargit d'autant de chaque côté
export function navBumpAt(px, pad = 0) {
  if (!navOrb.on) return 0;
  return tabHeight(px, navOrb.x, navOrb.l + pad, navOrb.r + pad, navOrb.bh, navOrb.f, navOrb.R);
}
