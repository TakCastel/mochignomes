// Petits tutos de découverte, un par nouveauté de la première visite (lib/growth.js FEATURES, chain).
// À chaque déblocage, une bannière (components/GuideCard.vue) dit quoi faire, une étape après l'autre ;
// une étape est faite quand le compteur `ev` bouge (store.count). La nouveauté suivante n'arrive
// qu'une fois le tuto terminé (ou passé) : on prend le temps d'explorer chaque menu.
// text : chaîne ou fonction (nom de la créature) → chaîne.
export const GUIDES = {
  ballon: [
    { ev: "activite:foot", text: (n) => `Touche le ballon dans l'herbe pour jouer au foot avec ${n} !` },
  ],
  sac: [
    { ev: "page:sac", text: "Ouvre le Sac, dans la barre du bas." },
    { ev: "pose", text: (n) => `Touche ${n} : elle prend la pose avec sa tenue !` },
    { ev: "habillage", text: "Touche « Retirer » sur son t-shirt, puis remets-le-lui." },
  ],
  boutique: [
    { ev: "page:boutique", text: "Ouvre la Boutique, dans la barre du bas." },
    { ev: "essayage", text: "Touche un vêtement, puis « Essayer » pour le voir sur elle." },
    { ev: "essayage:couleur", text: "Pendant l'essayage, touche une autre couleur." },
  ],
  cuisine: [
    { ev: "page:cuisine", text: "Ouvre la Cuisine, dans la barre du bas." },
    { ev: "cuisine", text: "Choisis les crêpes et prépare-les !" },
    { ev: "boutique:epicerie", text: "Dans la Boutique, va voir l'Épicerie : c'est là qu'on rachète des ingrédients." },
  ],
  tele: [
    { ev: "activite:tele", text: (n) => `Touche la télé dans le pré pour regarder un épisode avec ${n}.` },
  ],
  defis: [
    { ev: "page:jours", text: "Ouvre « Elle », puis « Jours » pour voir les défis du jour." },
  ],
};

export function guideText(step, name) {
  return typeof step.text === "function" ? step.text(name || "elle") : step.text;
}
