// Rappels locaux : notifications via service worker, Periodic Sync si dispo, .ics.
import { reactive, toRefs, computed } from "vue";
import { useTamagotchiStore } from "~/stores/useTamagotchiStore";
import { loadSettings, saveSettings, planFromStore, buildIcs, dayKey } from "~/lib/notify";

const st = reactive({
  ready: false,
  permission: "unsupported",
  settings: { enabled: false, hour: 19, quietFrom: 21, quietTo: 8, lastAsk: 0, lastSeen: 0, sent: {} },
  installable: false,
  installed: false,
  lastPlanned: [],
});
let timers = [];

const supported = () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
const persist = () => saveSettings(st.settings);

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

async function sendToSw(msg) {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const target = reg?.active || navigator.serviceWorker.controller;
    if (target) target.postMessage(msg);
    else if (reg && Notification.permission === "granted") await reg.showNotification(msg.title, { body: msg.body, tag: msg.tag, icon: "/icons/icon-192.png" });
  } catch { /* tant pis */ }
}

function schedule() {
  clearTimers();
  if (!supported() || !st.settings.enabled || st.permission !== "granted") { st.lastPlanned = []; return; }
  const plan = planFromStore(useTamagotchiStore(), st.settings);
  st.lastPlanned = plan;
  const now = Date.now();
  for (const n of plan) {
    const delay = n.at - now;
    if (delay > 2147483000) continue;
    timers.push(setTimeout(() => {
      const k = dayKey(n.at);
      st.settings.sent[k] = (st.settings.sent[k] || 0) + 1;
      persist();
      sendToSw({ type: "notify", title: n.title, body: n.body, tag: n.tag });
    }, delay));
  }
}

async function syncPeriodic() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.periodicSync) return;
    if (st.settings.enabled && st.permission === "granted") await reg.periodicSync.register("tamagotchi-bonjour", { minInterval: 20 * 3600 * 1000 });
    else await reg.periodicSync.unregister("tamagotchi-bonjour");
  } catch { /* non garanti */ }
}

function refreshInstall() {
  st.installable = !!window.__installPrompt;
  st.installed = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function init() {
  if (st.ready || typeof window === "undefined") return;
  st.ready = true;
  st.settings = loadSettings();
  st.permission = supported() ? Notification.permission : "unsupported";
  refreshInstall();
  window.addEventListener("tamagotchi-installable", refreshInstall);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      st.settings.lastSeen = Date.now(); // plan calculé depuis l'instant de départ
      persist();
      schedule();
      syncPeriodic();
    } else {
      clearTimers();
      st.settings.lastSeen = Date.now();
      persist();
    }
  });
  window.addEventListener("pagehide", () => { st.settings.lastSeen = Date.now(); persist(); schedule(); });
}

export function useNotifications() {
  init();
  const s = st.settings;
  return {
    ...toRefs(st),
    supported: computed(() => st.permission !== "unsupported"),
    permission: computed(() => st.permission),
    enabled: computed(() => st.settings.enabled && st.permission === "granted"),
    hour: computed(() => s.hour),
    quietFrom: computed(() => s.quietFrom),
    quietTo: computed(() => s.quietTo),
    isIos: computed(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)),
    lastAsk: computed(() => s.lastAsk),
    async enable() {
      if (!supported()) return false;
      let p = Notification.permission;
      if (p === "default") p = await Notification.requestPermission();
      st.permission = p;
      st.settings.enabled = p === "granted";
      persist();
      schedule();
      syncPeriodic();
      return p === "granted";
    },
    disable() {
      st.settings.enabled = false;
      persist();
      schedule();
      syncPeriodic();
    },
    setHour(h) {
      st.settings.hour = Math.min(23, Math.max(0, Number(h) || 19));
      persist();
    },
    markAsked() {
      st.settings.lastAsk = Date.now();
      persist();
    },
    async install() {
      const ev = window.__installPrompt;
      if (!ev) return false;
      ev.prompt();
      const r = await ev.userChoice.catch(() => null);
      window.__installPrompt = null;
      refreshInstall();
      return r?.outcome === "accepted";
    },
    downloadIcs() {
      const name = useTamagotchiStore().name || "ta créature";
      const blob = new Blob([buildIcs(st.settings.hour, name)], { type: "text/calendar;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "tamagotchi-rappel.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
  };
}
