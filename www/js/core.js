// Router, region "live", dan registry aksi (event delegation).
import { S, onChange } from "./data.js";
import { $, $$ } from "./util.js";

export const actions = {};   // data-act="nama"
export const forms = {};     // data-form="nama"
const regions = new Map();
// live(key, deps, fn, after) → HTML wadah yang otomatis diperbarui saat data `deps` berubah
export function live(key, deps, fn, after) {
  regions.set(key, { deps, fn, after });
  return `<div class="live" data-live="${key}">${fn()}</div>`;
}
// Wilayah yang sedang diisi (formulir yang sudah diubah, atau kolom yang sedang fokus) tidak digambar ulang oleh
// data realtime, supaya isian pengaturan tidak hilang. Digambar ulang setelah disimpan atau kolomnya ditinggalkan.
const busy = el => el.querySelector("form[data-dirty]") || (el.contains(document.activeElement) && document.activeElement.matches("input,textarea,select"));
const tunda = new Set();
function paint(key, force) {
  const r = regions.get(key); if (!r) return;
  let held = false;
  $$(`[data-live="${key}"]`).forEach(el => { if (!force && busy(el)) { held = true; return; } el.innerHTML = r.fn(); });
  if (held) tunda.add(key); else tunda.delete(key);
  r.after?.();
}
const flush = () => { [...tunda].forEach(k => { const el = $(`[data-live="${k}"]`); if (!el || !busy(el)) paint(k); }); };
document.addEventListener("focusout", () => setTimeout(flush, 0));
const markDirty = e => { const f = e.target.closest?.("form[data-form]"); if (f && !e.target.matches("[data-input],[data-change]") && f.dataset.form !== "chat") f.dataset.dirty = "1"; };
document.addEventListener("input", markDirty, true);
document.addEventListener("change", markDirty, true);
export const dirtyForm = () => $("#view form[data-dirty]");
onChange(k => regions.forEach((r, key) => { if (r.deps.includes(k) || r.deps.includes("*")) paint(key); }));
export const repaint = key => paint(key, true);

// ---------- Router ----------
export const routes = [];    // {test(path)->bool, view(path)->html|Promise, shell}
let current = "";
export const path = () => (location.hash || "#/").slice(1) || "/";
export const go = (p, replace) => { if (replace) location.replace("#" + p); else location.hash = p; };
export let onRoute = () => {};
export const setOnRoute = f => { onRoute = f; };
let lastHash = location.hash;
window.addEventListener("hashchange", () => {
  // Perubahan pengaturan yang belum disimpan tidak boleh hilang diam-diam saat pindah halaman.
  if (dirtyForm() && !confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?")) { history.replaceState(null, "", lastHash || "#/"); return; }
  lastHash = location.hash; onRoute(path());
});

// ---------- Tombol kembali Android (dipanggil MainActivity) ----------
// true = sudah ditangani di web; false = boleh keluar aplikasi.
let tekanKeluar = 0;
export const backHandlers = [];   // fungsi lain (panel emoji, lonceng, dll) → kembalikan true bila menutup sesuatu
window.tubiBack = () => {
  const o = $("#overlay");
  if (o && !o.hidden) { closeOverlay(); return true; }
  for (const h of backHandlers) { try { if (h()) return true; } catch {} }
  if (path() !== "/") {
    const awal = location.hash;
    if (history.length > 1) history.back(); else go("/", true);
    setTimeout(() => { if (location.hash === awal && !dirtyForm()) go("/", true); }, 350);
    return true;
  }
  if (Date.now() - tekanKeluar < 2000) return false;
  tekanKeluar = Date.now();
  import("./util.js").then(u => u.toast("Tekan kembali sekali lagi untuk keluar"));
  return true;
};

// ---------- Overlay (sheet / modal / drawer) ----------
export function openOverlay(html, cls = "") {
  const o = $("#overlay"); o.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`; o.hidden = false;
  requestAnimationFrame(() => o.classList.add("show")); document.body.classList.add("locked");
}
export function closeOverlay() {
  const o = $("#overlay"); o.classList.remove("show"); document.body.classList.remove("locked");
  setTimeout(() => { if (!o.classList.contains("show")) { o.hidden = true; o.innerHTML = ""; } }, 180);
}
document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlay(); });

// ---------- Form terkunci (pengaturan): baca saja, tekan "Ubah" untuk mengedit ----------
const formDibuka = new Set();
const PENSIL = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const tombolKunci = (n, buka) => buka ? `<button type="button" class="btn sm ghost" data-act="kfbatal" data-f="${n}">Batal</button>` : `<button type="button" class="btn sm" data-act="kfubah" data-f="${n}">${PENSIL} Ubah</button>`;
// kunci(`<form ... data-form="nama"><h3>Judul</h3> ...isi... </form>`) → judul + tombol Ubah, isi dikunci sampai Ubah ditekan
export const kunci = html => html.replace(/^(\s*<form[^>]*data-form="(\w+)"[^>]*)>\s*<h3>([\s\S]*?)<\/h3>([\s\S]*)<\/form>\s*$/, (_, buka, n, judul, isi) =>
  `${buka} data-kunci><div class="kf-head"><h3>${judul}</h3><span class="kf-tb">${tombolKunci(n, formDibuka.has(n))}</span></div><fieldset class="kf-isi col" ${formDibuka.has(n) ? "" : "disabled"}>${isi}</fieldset></form>`);
function aturKunci(f, buka) {
  const n = f.dataset.form; if (buka) formDibuka.add(n); else formDibuka.delete(n);
  const fs = f.querySelector(".kf-isi"); if (fs) fs.disabled = !buka;
  const tb = f.querySelector(".kf-tb"); if (tb) tb.innerHTML = tombolKunci(n, buka);
}
actions.kfubah = el => { const f = el.closest("form"); aturKunci(f, true); f.querySelector(".kf-isi input:not([type=checkbox]):not([type=file]),.kf-isi textarea")?.focus(); };
actions.kfbatal = el => { const f = el.closest("form"); f.reset(); delete f.dataset.dirty; aturKunci(f, false); const r = f.closest("[data-live]")?.dataset.live; if (r) repaint(r); };

// ---------- Delegasi event ----------
document.addEventListener("click", async e => {
  if (e.target.id === "overlay") return closeOverlay();
  const el = e.target.closest("[data-act]"); if (!el) return;
  const fn = actions[el.dataset.act]; if (!fn) return;
  if (el.tagName === "A") e.preventDefault();
  const btn = el.classList.contains("btn") ? el : null;
  try {
    const r = fn(el, e);
    if (r && typeof r.then === "function") { btn?.classList.add("loading"); try { await r; } finally { btn?.classList.remove("loading"); } }
  } catch (err) { console.error(err); import("./util.js").then(u => u.toast(err?.message || "Terjadi kesalahan.", "err")); }
});
document.addEventListener("submit", async e => {
  const f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
  const fn = forms[f.dataset.form]; if (!fn) return;
  const btn = f.querySelector("[type=submit]"); if (btn) btn.disabled = true;
  const wasDirty = f.dataset.dirty; delete f.dataset.dirty;   // dilepas dulu: fn() bisa berpindah halaman setelah berhasil
  try { await fn(f, new FormData(f)); if (f.hasAttribute("data-kunci")) aturKunci(f, false); setTimeout(flush, 0); }
  catch (err) { if (wasDirty) f.dataset.dirty = wasDirty; console.error(err); import("./util.js").then(u => u.toast(err?.message || "Terjadi kesalahan.", "err")); }
  finally { if (btn) btn.disabled = false; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.dataset?.enter) { e.preventDefault(); actions[e.target.dataset.enter]?.(e.target, e); return; }
  if (e.key === "Enter" && !e.shiftKey && e.target.matches("textarea[data-enter-submit]") && matchMedia("(min-width:760px)").matches) { e.preventDefault(); e.target.closest("form")?.requestSubmit(); }
});
document.addEventListener("input", e => {
  const t = e.target; if (t.matches("textarea[data-grow]")) { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; }
  const a = t.dataset?.input; if (a && actions[a]) actions[a](t, e);
});
document.addEventListener("change", e => { const a = e.target.dataset?.change; if (a && actions[a]) actions[a](e.target, e); });

// ---------- Teks tidak bisa disalin (kecuali di kolom isian) ----------
const editable = t => t?.closest?.("input,textarea,[contenteditable]");
["copy", "cut"].forEach(ev => document.addEventListener(ev, e => { if (!editable(e.target)) e.preventDefault(); }));
document.addEventListener("contextmenu", e => { if (!editable(e.target) && !e.target.closest?.(".leaflet-container")) e.preventDefault(); });
document.addEventListener("dragstart", e => { if (e.target.tagName === "IMG") e.preventDefault(); });

// ---------- Tombol kembali ke atas ----------
const toTop = document.createElement("button");
toTop.className = "to-top"; toTop.type = "button"; toTop.setAttribute("aria-label", "Kembali ke atas");
toTop.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
document.body.appendChild(toTop);
// Supaya tidak menghalangi isi halaman: hanya muncul saat menggulir KE ATAS di halaman panjang, hilang sendiri setelah
// 2,5 detik tanpa gerakan, dan tidak muncul di halaman chat / checkout / pembayaran atau saat panel terbuka.
let yLalu = scrollY, sembunyiT = 0;
const halamanTanpaPanah = () => /^\/(chat|checkout|pay)|^\/admin\/chat/.test((location.hash || "#/").slice(1)) || document.body.classList.contains("locked");
addEventListener("scroll", () => {
  const y = scrollY, naik = y < yLalu - 4, turun = y > yLalu + 4; if (naik || turun) yLalu = y;
  if (y <= 900 || turun || halamanTanpaPanah()) { toTop.classList.remove("show"); return; }
  if (naik) { toTop.classList.add("show"); clearTimeout(sembunyiT); sembunyiT = setTimeout(() => toTop.classList.remove("show"), 2500); }
}, { passive: true });
addEventListener("hashchange", () => toTop.classList.remove("show"));
