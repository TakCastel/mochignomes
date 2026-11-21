// Le personnage 3D vivant, partagé entre les composants (ActivityPlayer, objets du pré...).
// L'intégrateur appelle setLiveCreature(creature) dans Tamagotchi.vue après createCreature(),
// et setLiveCreature(null) avant creature.dispose().
//
//   liveCreature    shallowRef : l'objet renvoyé par createCreature (ou null sans 3D)
//   activeActivity  ref : id de l'activité en cours (ActivityPlayer ouvert) ou null.
//                   Les objets du pré se cachent et la vie spontanée se tait tant qu'il vaut quelque chose.
import { ref, shallowRef } from "vue";

export const liveCreature = shallowRef(null);
export const activeActivity = ref(null);

export function setLiveCreature(c) {
  liveCreature.value = c || null;
}

export function useLiveCreature() {
  return { liveCreature, activeActivity, setLiveCreature };
}
