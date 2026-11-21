// lib/payments.js
// Packs de gemmes. AUCUN vrai paiement n'est branché pour l'instant :
// - avec ?achats=test dans l'URL, l'achat est SIMULÉ (gemmes créditées, toast « Achat de test ») ;
// - sinon, l'achat est refusé avec « Les achats arrivent bientôt. ».
// On ne fait jamais croire qu'un vrai paiement a eu lieu.
import { useInventoryStore } from "~/stores/useInventoryStore";
import { gameToast } from "~/composables/useCreatureMood";

export const GEM_PACKS = [
  { id: "poignee", label: "Poignée de gemmes", gems: 50, bonus: 0, price: 0.99, priceLabel: "0,99 €" },
  { id: "bourse", label: "Bourse de gemmes", gems: 120, bonus: 10, price: 1.99, priceLabel: "1,99 €" },
  { id: "coffre", label: "Coffre de gemmes", gems: 300, bonus: 20, price: 4.99, priceLabel: "4,99 €", popular: true },
  { id: "tresor", label: "Trésor de gemmes", gems: 700, bonus: 30, price: 9.99, priceLabel: "9,99 €", best: true },
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

// Les achats réels sont-ils disponibles ? (non, tant qu'aucun fournisseur n'est branché)
export function purchasesAvailable() {
  return purchasesTestMode();
}

// Achète un pack. Renvoie { ok, test?, gems?, reason? }
export async function buyGemPack(id) {
  const pack = GEM_PACKS.find((p) => p.id === id);
  if (!pack) return { ok: false, reason: "Pack introuvable." };

  if (purchasesTestMode()) {
    const inv = useInventoryStore();
    inv.earnGems(pack.gems);
    try { gameToast(`Achat de test : +${pack.gems} gemmes (aucun paiement)`, "solar:diamond-bold-duotone"); } catch { /* hors navigateur */ }
    return { ok: true, test: true, gems: pack.gems };
  }

  // Point d'extension : brancher ici un vrai fournisseur (Stripe Checkout, achats intégrés
  // App Store / Google Play...). Le crédit des gemmes ne doit se faire qu'après confirmation
  // côté serveur (webhook), jamais sur la seule réponse du client.
  //   const session = await $fetch("/api/checkout", { method: "POST", body: { pack: pack.id } });
  //   window.location.href = session.url;
  return { ok: false, reason: COMING_SOON };
}
