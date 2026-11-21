// Petits tutos de découverte, un par nouveauté de la première visite (lib/growth.js FEATURES, chain).
// À chaque déblocage, une bannière (components/GuideCard.vue) dit quoi faire, une étape après l'autre ;
// une étape est faite quand le compteur `ev` bouge (store.count). La nouveauté suivante n'arrive
// qu'une fois le tuto terminé (ou passé) : on prend le temps d'explorer chaque menu.
// text : chaîne ou fonction (nom de la créature) → chaîne.
// ring : l'étape se fait dans le menu sur la créature → il s'ouvre seul, la bonne pilule mise en avant
//        (focus d'InteractionRing ; à la maison, vue studio, le ballon et la télé du pré ne sont pas à l'écran).
// nav  : l'étape ouvre un onglet de la barre du bas → son bouton pulse (BottomNav).
export const GUIDES = {
  ballon: [
    // « act:foot » : la pilule Foot, qu'elle remplace « Jouer » ou qu'elle soit rangée sous « Jouer… »
    { ev: "activite:foot", ring: "act:foot", text: (n) => `Touche « Foot » pour jouer au ballon avec ${n} !` },
  ],
  sac: [
    { ev: "page:sac", nav: "sac", text: "Ouvre le Sac, dans la barre du bas." },
    { ev: "pose", text: (n) => `Touche ${n} : elle prend la pose avec sa tenue !` },
    { ev: "habillage", text: "Enlève son t-shirt avec « Retirer », puis remets-le-lui." },
  ],
  boutique: [
    { ev: "page:boutique", nav: "boutique", text: "Ouvre la Boutique, dans la barre du bas." },
    { ev: "essayage", text: "Touche un vêtement, puis « Essayer » pour le voir sur elle." },
    { ev: "essayage:couleur", text: "Pendant l'essayage, touche une autre couleur." },
  ],
  cuisine: [
    { ev: "page:cuisine", nav: "cuisine", text: "Ouvre la Cuisine, dans la barre du bas." },
    { ev: "cuisine", text: "Choisis les crêpes et prépare-les !" },
    { ev: "plat", text: (n) => `Donne les crêpes à ${n}, ou garde-les au frigo pour plus tard.` },
  ],
  tele: [
    { ev: "activite:tele", ring: "act:tele", text: (n) => `Touche « Jouer… », puis « Télé » pour regarder un épisode avec ${n}.` },
  ],
  defis: [
    { ev: "page:jours", nav: "elle", text: "Ouvre « Elle », puis « Jours » pour voir les défis du jour." },
  ],
};

export function guideText(step, name) {
  return typeof step.text === "function" ? step.text(name || "elle") : step.text;
}

// étape du tuto en cours (ou null)
export function currentGuideStep(store) {
  const g = store?.guide;
  return g ? GUIDES[g.key]?.[g.step] || null : null;
}
