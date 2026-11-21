// Volet tirable par sa poignée :
// - glisser vers le bas : la feuille suit le doigt, puis se ferme (au-delà d'un seuil ou d'un geste vif) ;
// - glisser vers le haut : elle s'agrandit (résistance élastique pendant le geste) ;
// - toucher la poignée sans glisser : bascule grande / normale.
// Usage : const { tall, grab } = useSheetDrag(sheetRef, close) ; <div class="grab-zone" v-on="grab"> ;
//         :class="{ 'is-tall': tall }" sur la feuille.
import { ref } from "vue";

export function useSheetDrag(sheetRef, onClose) {
  const tall = ref(false);
  let startY = 0, dy = 0, t0 = 0, active = false;

  const settle = (s, ms) => setTimeout(() => { s.style.transition = ""; s.style.transform = ""; }, ms);

  function down(e) {
    const s = sheetRef.value;
    if (!s) return;
    active = true;
    startY = e.clientY;
    dy = 0;
    t0 = performance.now();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    s.style.transition = "none";
  }
  function move(e) {
    if (!active) return;
    const s = sheetRef.value;
    if (!s) return;
    dy = e.clientY - startY;
    // vers le bas : suit le doigt ; vers le haut : petite résistance élastique
    const y = dy > 0 ? dy : -Math.min(36, Math.sqrt(-dy) * 4);
    s.style.transform = `translateY(${y}px)`;
  }
  function up() {
    if (!active) return;
    active = false;
    const s = sheetRef.value;
    if (!s) return;
    const v = dy / Math.max(1, performance.now() - t0); // px/ms
    s.style.transition = "transform 0.34s cubic-bezier(0.22, 1, 0.36, 1)";
    if (Math.abs(dy) < 5) {
      tall.value = !tall.value; // simple toucher
      s.style.transform = "";
    } else if (dy > 110 || (dy > 30 && v > 0.5)) {
      if (tall.value && dy < 220 && v < 0.9) {
        tall.value = false; // grande : un premier geste la ramène à la taille normale
        s.style.transform = "";
      } else {
        s.style.transform = "translateY(105%)";
        setTimeout(() => onClose?.(), 200);
        return settle(s, 700);
      }
    } else if (dy < -36 || (dy < -12 && v < -0.4)) {
      tall.value = true;
      s.style.transform = "";
    } else {
      s.style.transform = "";
    }
    settle(s, 360);
  }

  return { tall, grab: { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up } };
}
