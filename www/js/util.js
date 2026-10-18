export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const rupiah = n => "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));
export const ls = {
  get(k, d) { try { const v = localStorage.getItem("tubi:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tubi:" + k, JSON.stringify(v)); } catch {} }
};
export const secs = ts => ts?.seconds ?? (ts?.toMillis ? ts.toMillis() / 1000 : 0);
export function timeText(ts) {
  if (!ts) return "Baru saja";
  try { const d = ts.toDate ? ts.toDate() : new Date(ts); return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d); } catch { return ""; }
}
export function hm(ts) { try { return ts ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(ts.toDate()) : "…"; } catch { return ""; } }
export function ago(ts) {
  const s = Math.max(0, Date.now() / 1000 - secs(ts)); if (!ts) return "baru saja";
  if (s < 60) return "baru saja"; if (s < 3600) return Math.floor(s / 60) + " mnt lalu";
  if (s < 86400) return Math.floor(s / 3600) + " jam lalu"; return Math.floor(s / 86400) + " hari lalu";
}
export const normPhone = v => { let n = String(v || "").replace(/\D/g, ""); if (n.startsWith("0")) n = "62" + n.slice(1); else if (n.startsWith("8")) n = "62" + n; return n; };
export const initial = n => esc((String(n || "?").trim()[0] || "?").toUpperCase());
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

export function toast(msg, type = "") {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div"); el.className = "toast " + type; el.textContent = msg; box.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3200); setTimeout(() => el.remove(), 3600);
}
let ac;
export function beep() {
  if (ls.get("sound", true) === false) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.setValueAtTime(.15, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .5); o.start(); o.stop(ac.currentTime + .5); } catch {}
}
export function compressImage(file, max = 900, limit = 380000) {
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error("File harus berupa gambar."));
    const r = new FileReader();
    r.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      let q = .82, out = c.toDataURL("image/jpeg", q); while (out.length > limit && q > .3) { q -= .1; out = c.toDataURL("image/jpeg", q); } res(out);
    }; im.onerror = () => rej(new Error("Gambar tidak bisa dibaca.")); im.src = r.result; };
    r.onerror = () => rej(new Error("File tidak bisa dibaca.")); r.readAsDataURL(file);
  });
}
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  store: '<path d="M4 9l1-5h14l1 5"/><path d="M4 9a3 3 0 0 0 5 2 3 3 0 0 0 6 0 3 3 0 0 0 5-2v11H4z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>', bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  check: '<path d="M5 12l5 5L20 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', logout: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>', print: '<path d="M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', back: '<path d="M15 5l-7 7 7 7"/>', wa: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .7c-1-.4-2-1.400-2.300-2.400l.7-1-1-2z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="8" cy="8" r="1.500"/>'
};
export const svg = (n, s = 20) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;
export const stars = (n, size = 14) => `<span class="stars" aria-label="${(+n).toFixed(1)} dari 5">${"★".repeat(Math.round(n))}${"☆".repeat(5 - Math.round(n))}</span>`;
