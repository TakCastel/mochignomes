// Rappels honnêtes : aucun serveur push. On planifie des notifications locales
// depuis les prédictions du store, avec un budget strict (pas de harcèlement).
export const NOTIF_KEY = "tamagotchi-notif";
export const DEFAULTS = { enabled: false, hour: 19, quietFrom: 21, quietTo: 8, lastAsk: 0, lastSeen: 0, sent: {} };
export const MAX_PER_DAY = 2;
export const MIN_AWAY_MS = 2 * 3600 * 1000;

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}");
    return { ...DEFAULTS, ...raw, sent: { ...(raw.sent || {}) } };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(s));
  } catch { /* stockage indisponible */ }
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// plage calme, qui peut passer minuit (ex. 21h -> 8h)
export function inQuiet(ts, from, to) {
  const h = new Date(ts).getHours();
  return from > to ? h >= from || h < to : h >= from && h < to;
}

// Choisit les notifications à programmer : futur, hors plage calme, une par
// besoin, 2 par jour au plus, jamais moins de 2 h après la dernière ouverture.
export function planFromList(list, settings, now = Date.now()) {
  const seen = new Set();
  const perDay = { ...(settings.sent || {}) };
  const out = [];
  for (const n of [...list].sort((a, b) => a.at - b.at)) {
    if (n.at <= now || seen.has(n.type)) continue;
    if (inQuiet(n.at, settings.quietFrom, settings.quietTo)) continue;
    if (n.at - (settings.lastSeen || now) < MIN_AWAY_MS) continue;
    const k = dayKey(n.at);
    if ((perDay[k] || 0) >= MAX_PER_DAY) continue;
    perDay[k] = (perDay[k] || 0) + 1;
    seen.add(n.type);
    out.push({ type: n.type, at: n.at, title: n.title, body: n.body, tag: `tamagotchi-${n.type}` });
  }
  return out;
}

export function planFromStore(store, settings = loadSettings(), now = Date.now()) {
  let list = [];
  try {
    list = store.predictNext ? store.predictNext(now) || [] : [];
  } catch { /* prédiction indisponible */ }
  return planFromList(list, settings, now);
}

// Rappel d'agenda quotidien : marche partout, iPhone compris.
export function buildIcs(hour, name = "ta créature") {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const url = typeof location !== "undefined" ? location.origin : "";
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tamagotchi//FR", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:tamagotchi-quotidien-${stamp}@tamagotchi`,
    `DTSTAMP:${stamp}T${pad(hour)}0000`,
    `DTSTART:${stamp}T${pad(hour)}0000`,
    `DTEND:${stamp}T${pad(hour)}1000`,
    "RRULE:FREQ=DAILY",
    `SUMMARY:Un peu de tendresse pour ${name}`,
    `DESCRIPTION:Passe voir ${name} et lui donner un peu de tendresse quand tu as une minute.${url ? ` Ouvre ${url}` : ""}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:Un peu de tendresse pour ${name} ?`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
