// Petits bips WebAudio (aucun fichier son). Respecte le réglage « tamagotchi-sound » (0/off = muet).
//   import { beep } from "~/composables/useBeep";  beep("ball")
//   const { beep, haptic } = useBeep()
// kinds : tap, ball, kick, goal, coin, fruit, fail, star, record, zap, count, go, love, end
const SOUNDS = {
  tap: [[660, 0.05, "sine", 0.12]],
  ball: [[520, 0.06, "triangle", 0.22], [780, 0.05, "triangle", 0.12, 0.04]],
  kick: [[180, 0.08, "square", 0.12], [90, 0.08, "sine", 0.2, 0.02]],
  goal: [[523, 0.1, "triangle", 0.2], [659, 0.1, "triangle", 0.2, 0.09], [784, 0.1, "triangle", 0.2, 0.18], [1047, 0.22, "triangle", 0.22, 0.27]],
  coin: [[988, 0.06, "square", 0.08], [1319, 0.12, "square", 0.08, 0.06]],
  fruit: [[700, 0.06, "sine", 0.18], [1050, 0.08, "sine", 0.14, 0.05]],
  fail: [[300, 0.14, "sawtooth", 0.08], [200, 0.22, "sawtooth", 0.08, 0.12]],
  star: [[880, 0.08, "triangle", 0.18], [1175, 0.08, "triangle", 0.18, 0.08], [1568, 0.2, "triangle", 0.18, 0.16]],
  record: [[659, 0.09, "triangle", 0.2], [784, 0.09, "triangle", 0.2, 0.1], [988, 0.09, "triangle", 0.2, 0.2], [1319, 0.3, "triangle", 0.22, 0.3]],
  zap: [[1400, 0.04, "square", 0.05], [400, 0.06, "square", 0.05, 0.03]],
  count: [[600, 0.09, "sine", 0.2]],
  go: [[900, 0.2, "sine", 0.24]],
  love: [[740, 0.1, "sine", 0.16], [988, 0.18, "sine", 0.16, 0.1]],
  end: [[784, 0.12, "sine", 0.16], [659, 0.12, "sine", 0.16, 0.12], [523, 0.24, "sine", 0.16, 0.24]],
};

let ctx = null;
const muted = () => {
  try { return ["0", "false", "off"].includes(localStorage.getItem("tamagotchi-sound")); } catch { return false; }
};

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function beep(kind = "tap") {
  const notes = SOUNDS[kind];
  if (!notes || muted()) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const [freq, dur, type, vol, delay = 0] of notes) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0 + delay);
    g.gain.setValueAtTime(0.0001, t0 + delay);
    g.gain.exponentialRampToValueAtTime(vol, t0 + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0 + delay);
    o.stop(t0 + delay + dur + 0.02);
  }
}

// Vibration (respecte « tamagotchi-haptics »)
export function haptic(pattern = 10) {
  try {
    if (["0", "false", "off"].includes(localStorage.getItem("tamagotchi-haptics"))) return;
    navigator.vibrate?.(pattern);
  } catch { /* non supporté */ }
}

export function useBeep() {
  return { beep, haptic };
}
