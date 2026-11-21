// lib/payments.js
// AUCUNE monnaie premium n'est vendue en V1, et aucun vrai paiement n'est branché.
// - Les Étoiles (clé `gems`) se gagnent uniquement en jouant (maîtrise, sets, jours de jeu).
// - GEM_PACKS n'existe que pour le développement : visible et « achetable » seulement avec
//   ?achats=test dans l'URL (achat SIMULÉ, toast « Achat de test », aucun paiement).
// - Sans ?achats=test : visiblePacks() est vide, buyGemPack() refuse avec « Les achats arrivent bientôt. »
// On ne fait jamais croire qu'un vrai paiement a eu lieu.
//
// Plus tard seulement (vrai fournisseur + sauvegarde fiable) : des packs COSMÉTIQUES à prix fixe
// affiché en euros (« Pack Galaxie 2,99 € »), achetés une fois, non aléatoires, qui n'expirent pas,
// derrière un écran parent. Jamais de monnaie achetable, jamais de tirage payant, jamais de compte
// à rebours sur une offre payante. Jamais payant : nourriture, énergie, recharges, soin, série,
// coffres, objets d'activité, boosts, défis, ni rien qui compte dans un set ou la collection.
import { useInventoryStore } from "~/stores/useInventoryStore";
import { gameToast } from "~/composables/useCreatureMood";

// Packs de TEST uniquement (jamais affichés hors ?achats=test)
export const GEM_PACKS = [
  { id: "test-petit", label: "Étoiles de test", gems: 50, bonus: 0, price: 0, priceLabel: "Test" },
  { id: "test-grand", label: "Beaucoup d'Étoiles de test", gems: 300, bonus: 0, price: 0, priceLabel: "Test" },
];

export const COMING_SOON = "Les achats arrivent bientôt.";

// Mode test : ?achats=test dans l'URL
export function purchasesTestMode() {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("achats") === "test";
  } catch {
    return false;
  }
}

// Les achats réels sont-ils disponibles ? Non : aucun fournisseur n'est branché.
export function purchasesAvailable() {
  return false;
}

// Packs à afficher : aucun, sauf en mode test (développement)
export function visiblePacks() {
  return purchasesTestMode() ? GEM_PACKS : [];
}

// « Achète » un pack de test. Renvoie { ok, test?, gems?, reason? }
export async function buyGemPack(id) {
  if (!purchasesTestMode()) return { ok: false, reason: COMING_SOON };
  const pack = GEM_PACKS.find((p) => p.id === id);
  if (!pack) return { ok: false, reason: "Pack introuvable." };
  const inv = useInventoryStore();
  inv.earnGems(pack.gems);
  try { gameToast(`Achat de test : +${pack.gems} Étoiles (aucun paiement)`, "solar:star-bold-duotone"); } catch { /* hors navigateur */ }
  return { ok: true, test: true, gems: pack.gems };
  // Point d'extension (plus tard, packs cosmétiques à prix fixe) : brancher un vrai fournisseur
  // (Stripe Checkout, achats intégrés App Store / Google Play). Le déblocage ne doit se faire
  // qu'après confirmation côté serveur (webhook), jamais sur la seule réponse du client.
}
