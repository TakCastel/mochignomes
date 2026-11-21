// lib/itemIcons.js : icône (Phosphor, unicolore donc teintable) de chaque vêtement,
// pour les cartes de la boutique, du Sac et de la collection. Secours : icône de l'emplacement.
import { SLOT_ICONS, itemById, colorByKey } from "~/lib/catalog";

export const ITEM_ICONS = {
  bonnet: "ph:beanie-fill",
  casquette: "ph:baseball-cap-fill",
  "chapeau-fete": "ph:confetti-fill",
  noeud: "ph:heart-fill",
  "oreilles-chat": "ph:cat-fill",
  couronne: "ph:crown-fill",
  "lunettes-rondes": "ph:eyeglasses-fill",
  "lunettes-soleil": "ph:sunglasses-fill",
  echarpe: "ph:snowflake-fill",
  "noeud-papillon": "ph:sparkle-fill",
  tshirt: "ph:t-shirt-fill",
  "maillot-foot": "ph:soccer-ball-fill",
  mariniere: "ph:anchor-fill",
  sweat: "ph:hoodie-fill",
  tutu: "ph:dress-fill",
  "pull-noel": "ph:tree-evergreen-fill",
  "sac-dos": "ph:backpack-fill",
  "ballon-attache": "ph:balloon-fill",
  cape: "ph:magic-wand-fill",
  "ailes-papillon": "ph:butterfly-fill",
};

export function itemIcon(id) {
  return ITEM_ICONS[id] || SLOT_ICONS[itemById(id)?.slot] || "solar:t-shirt-bold-duotone";
}

// Fond CSS d'une pastille de couleur (dégradé pour les couleurs premium)
export function swatchBg(key) {
  const c = colorByKey(key);
  if (!c) return "#ddd";
  if (key === "galaxie") return `radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2px), radial-gradient(circle at 70% 60%, #fff 0 1px, transparent 1.5px), linear-gradient(135deg, ${c.hex}, ${c.hex2})`;
  if (c.hex2) return `linear-gradient(135deg, ${c.hex}, ${c.hex2})`;
  return c.hex;
}

// Couleur de l'icône d'un vêtement (les couleurs très claires restent lisibles sur fond blanc)
const INK = { blanc: "#d6cfbf", or: "#eab308", galaxie: "#6b3fd0", jaune: "#f5c211", ciel: "#5cb8f0", menthe: "#4fcfa6" };
export function inkFor(key) {
  return INK[key] || colorByKey(key)?.hex || "#9aa3ad";
}
