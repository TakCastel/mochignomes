// État dérivé partagé entre les composants : humeur, bouderie, et un petit
// canal pour piloter l'écran depuis n'importe où (parler, tourner, photo,
// panneau ouvert, notifications).
import { computed, reactive } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { moodFromStats, morphFromStats } from "~/lib/creatureLook";

export const gameBus = reactive({
  speech: null, // { text, id }
  command: null, // { type: "rotate" | "photo" | "react", value, id }
  page: null, // page plein écran : null (Maison) | "elle" | "jours" | "album" | "sac" | "boutique"
  pageTab: "", // onglet demandé à l'ouverture (Sac : tenues | frigo | collection ; Boutique : vetements | epicerie | objets)
  pageFocus: "", // élément mis en avant (vêtement, ingrédient, objet)
  pageFocusColor: "", // couleur présélectionnée (Boutique)
  albumTab: "photos", // "photos" | "succes"
  highlight: null, // { action, id } : fait pulser une tuile d'action
  sheet: null, // fenêtre ouverte : null | "reglages" | "manger" | "cuisine" | "activites"
  kitchenFocus: "", // recette mise en avant dans la cuisine
  activity: null, // id de l'activité 3D en cours (ActivityPlayer monté)
  sideW: 0, // volet latéral ouvert à droite (Sac) : sa largeur en px, la créature se recadre à gauche ; 0 = aucun
  tryTop: 0, // essayage en boutique : haut (px) de la barre d'essayage, la créature se cadre au-dessus ; 0 = pas d'essayage
  coinFx: null, // dernier gain du Sac, pour les « +N » volants (posé par inventory.earn)
  toasts: [], // notifications { id, text, icon }
  phase: "day",
  seenUnlocked: 0, // succès déjà vus dans le carnet
});

export function gameSay(text) {
  gameBus.speech = { text, id: Math.random() };
}

export function gameCommand(type, value) {
  gameBus.command = { type, value, id: Math.random() };
}

let toastId = 0;
const MAX_TOASTS = 2; // jamais une pile de bandeaux : les plus anciens laissent la place
export function gameToast(text, icon = "solar:stars-bold-duotone") {
  if (gameBus.toasts.some((t) => t.text === text)) return; // déjà affiché
  const id = ++toastId;
  gameBus.toasts.push({ id, text, icon });
  while (gameBus.toasts.length > MAX_TOASTS) gameBus.toasts.shift();
  setTimeout(() => {
    const i = gameBus.toasts.findIndex((t) => t.id === id);
    if (i >= 0) gameBus.toasts.splice(i, 1);
  }, 3200);
}

const PAGE_NAMES = { elle: "Elle", jours: "Jours", album: "Album", sac: "Sac", boutique: "Boutique" };
// écrans cachés tant que la nouveauté correspondante n'est pas débloquée (store.features)
const PAGE_FEATURE = { sac: "sac", boutique: "boutique" };
const SHEET_FEATURE = { cuisine: "cuisine", activites: "ballon" };

function featureOpen(key) {
  if (!key) return true;
  const store = useTamagotchiStore();
  return !!store.features?.[key];
}

// opts : { tab, focus, focusColor } pour Sac / Boutique
export function openPage(name, opts = {}) {
  if (!PAGE_NAMES[name]) return closePage();
  const store = useTamagotchiStore();
  const pageLocked = name in PAGE_FEATURE ? !featureOpen(PAGE_FEATURE[name]) : !(store.unlockedPages || []).includes(name);
  if (pageLocked) {
    gameToast(`${PAGE_NAMES[name]} arrive bientôt, continue de t'occuper d'elle.`, "solar:lock-keyhole-bold");
    return;
  }
  gameBus.sheet = null;
  gameBus.pageTab = opts.tab || "";
  gameBus.pageFocus = opts.focus || "";
  gameBus.pageFocusColor = opts.focusColor || "";
  gameBus.page = name;
}
export function closePage() {
  gameBus.page = null;
  gameBus.pageTab = "";
  gameBus.pageFocus = "";
  gameBus.pageFocusColor = "";
}
export function openSheet(name) {
  if (!featureOpen(SHEET_FEATURE[name])) return;
  gameBus.page = null;
  gameBus.sheet = name;
}
export function closeSheet() {
  gameBus.sheet = null;
}
export function openSettings() {
  gameBus.sheet = "reglages";
}
export function closeSettings() {
  gameBus.sheet = null;
}
// Cuisine (recette mise en avant facultative)
export function openKitchen(focus = "") {
  if (!featureOpen("cuisine")) return;
  gameBus.kitchenFocus = focus || "";
  openSheet("cuisine");
}
// Lance une activité 3D (ActivityPlayer vérifie lui-même si elle peut jouer)
export function launchActivity(id) {
  if (!id) return;
  gameBus.page = null;
  gameBus.sheet = null;
  gameBus.activity = id;
}
export function closeActivity() {
  gameBus.activity = null;
}
// Navigation générique émise par les écrans : { to, tab?, focus?, focusColor? }
export function navigate(e = {}) {
  const to = e.to || "maison";
  if (to === "maison") { closePage(); gameBus.sheet = null; return; }
  if (to === "cuisine") return openKitchen(e.focus);
  if (to === "manger") return openSheet("manger");
  if (to === "activites") return openSheet("activites");
  if (to === "activite") return launchActivity(e.focus);
  if (to === "album" && e.tab) gameBus.albumTab = e.tab;
  return openPage(to, { tab: e.tab, focus: e.focus, focusColor: e.focusColor });
}
export function highlightAction(action) {
  gameBus.page = null;
  gameBus.sheet = null;
  gameBus.highlight = { action, id: Math.random() };
}

// Une seule carte à la fois sur l'écran principal, par ordre de priorité :
// tutoriel (WelcomeCard) → retrouvailles (AwayCard) → nouveauté (UnlockCard) → rappels (NotifPrompt).
// Les cartes de nouveauté et de rappels attendent aussi que l'écran principal soit libre
// (aucune page, fenêtre ou activité ouverte).
export function useOverlayTurn() {
  const store = useTamagotchiStore();
  return computed(() => {
    if (!store.hatched || (store.onboardStep ?? 6) < 6) return "welcome";
    if (store.away) return "away";
    if (gameBus.page || gameBus.sheet || gameBus.activity) return null;
    const ev = store.unlockEvent;
    if (ev && !ev.seen) return "unlock";
    return "notif";
  });
}

// Succès déjà vus dans l'Album (pastille) : retenu d'une visite à l'autre
const SEEN_KEY = "tamagotchi-succes-vus";
export function loadSeenUnlocked(fallback) {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const v = Number(raw);
    if (raw != null && Number.isFinite(v)) gameBus.seenUnlocked = v;
    else markSeenUnlocked(fallback);
  } catch { gameBus.seenUnlocked = fallback; }
}
export function markSeenUnlocked(n) {
  gameBus.seenUnlocked = n;
  try { localStorage.setItem(SEEN_KEY, String(n)); } catch { /* stockage indisponible */ }
}

export function useCreatureMood() {
  const store = useTamagotchiStore();
  const stats = computed(() => ({
    hunger: store.hunger, cleanliness: store.cleanliness, fun: store.fun,
    energy: store.energy, health: store.health, isSleeping: store.isSleeping,
  }));
  // lastUpdate avance chaque seconde : il sert d'horloge pour la bouderie
  const sulking = computed(() => store.isSulking(store.lastUpdate || Date.now()));
  const mood = computed(() => moodFromStats(stats.value, store.traits, sulking.value));
  const morph = computed(() => morphFromStats(stats.value, store.traits));
  return { store, stats, sulking, mood, morph };
}
