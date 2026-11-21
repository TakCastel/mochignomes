import { reactive } from "vue";

// Forme courante de la bosse de la barre du bas, en coordonnées écran, pour que les panneaux
// au-dessus puissent l'épouser. Écrit par BottomNav, lu par StatsStrip.
// x : centre de la bosse ; top : haut de la barre (hors bosse) ; bh/bw : hauteur et demi-largeur.
export const navOrb = reactive({ on: false, x: 0, top: 0, bh: 0, bw: 1 });

// hauteur de la bosse à l'abscisse écran px (0 loin d'elle)
export function navBumpAt(px) {
  if (!navOrb.on) return 0;
  const t = (px - navOrb.x) / navOrb.bw;
  return navOrb.bh * Math.exp(-t * t * 1.15);
}
