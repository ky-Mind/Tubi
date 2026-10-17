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
function paint(key) {
  const r = regions.get(key); if (!r) return;
  $$(`[data-live="${key}"]`).forEach(el => { el.innerHTML = r.fn(); });
  r.after?.();
}
onChange(k => regions.forEach((r, key) => { if (r.deps.includes(k) || r.deps.includes("*")) paint(key); }));
export const repaint = key => paint(key);

// ---------- Router ----------
export const routes = [];    // {test(path)->bool, view(path)->html|Promise, shell}
let current = "";
export const path = () => (location.hash || "#/").slice(1) || "/";
export const go = (p, replace) => { if (replace) location.replace("#" + p); else location.hash = p; };
export let onRoute = () => {};
export const setOnRoute = f => { onRoute = f; };
window.addEventListener("hashchange", () => { onRoute(path()); });

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
  try { await fn(f, new FormData(f)); } catch (err) { console.error(err); import("./util.js").then(u => u.toast(err?.message || "Terjadi kesalahan.", "err")); }
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
