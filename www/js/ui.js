// Komponen UI bersama: dialog konfirmasi, tema, pemilih foto.
import { actions } from "./core.js";
import { $, esc, ls } from "./util.js";

// ---- Dialog konfirmasi / input (pengganti confirm() & prompt() bawaan browser) ----
export function ask({ title, text = "", ok = "Ya", cancel = "Batal", danger = false, input, value = "", placeholder = "" }) {
  return new Promise(res => {
    const d = $("#dialog"), hasIn = input !== undefined;
    d.innerHTML = `<div class="sheet dlg-box" role="alertdialog" aria-modal="true"><h3>${esc(title)}</h3>${text ? `<p class="muted" style="margin:8px 0 0;white-space:pre-line">${esc(text)}</p>` : ""}
      ${hasIn ? `<textarea id="dlgin" rows="3" placeholder="${esc(placeholder)}" style="margin-top:12px">${esc(value)}</textarea>` : ""}
      <div class="row dlg-actions"><button class="btn sp" data-d="0">${esc(cancel)}</button><button class="btn pri sp ${danger ? "red" : ""}" data-d="1">${esc(ok)}</button></div></div>`;
    d.hidden = false; requestAnimationFrame(() => { d.classList.add("show"); (hasIn ? $("#dlgin") : d.querySelector("[data-d='1']"))?.focus(); });
    const done = v => { d.classList.remove("show"); d.onclick = null; document.removeEventListener("keydown", kd, true); setTimeout(() => { d.hidden = true; d.innerHTML = ""; }, 160); res(v); };
    const val = yes => yes ? (hasIn ? $("#dlgin").value : true) : (hasIn ? null : false);
    d.onclick = e => { const b = e.target.closest("[data-d]"); if (b) done(val(b.dataset.d === "1")); else if (e.target === d) done(val(false)); };
    const kd = e => { if (e.key === "Escape") { e.stopPropagation(); done(val(false)); } else if (e.key === "Enter" && !hasIn) { e.stopPropagation(); done(val(true)); } };
    document.addEventListener("keydown", kd, true);
  });
}
export const confirmBox = (title, text, ok = "Ya, lanjutkan", danger = true) => ask({ title, text, ok, danger });

// ---- Tema: auto | light | dark ----
const mq = matchMedia("(prefers-color-scheme: dark)");
export const themePref = () => { const t = ls.get("theme", "auto"); return t === "dark" || t === "light" ? t : "auto"; };
export function applyTheme() { const p = themePref(); document.body.classList.toggle("dark", p === "dark" || (p === "auto" && mq.matches)); document.querySelector('meta[name="theme-color"]')?.setAttribute("content", document.body.classList.contains("dark") ? "#1c1819" : "#e11d2e"); }
mq.addEventListener?.("change", applyTheme);
export const setTheme = t => { ls.set("theme", t); applyTheme(); };

// ---- Pemilih foto dengan pratinjau & drag-drop ----
export const dropzone = (name, current = "", label = "Pilih foto atau seret ke sini") => `<label class="drop" data-drop><input type="file" name="${name}" accept="image/*" data-change="filePrev" hidden>
  <span class="drop-pv">${current ? `<img src="${esc(current)}" alt="">` : `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>`}</span>
  <span class="drop-tx"><b>${label}</b><small class="muted">JPG/PNG · otomatis dikompres</small></span></label>`;
actions.filePrev = inp => {
  const f = inp.files?.[0], pv = inp.closest("label").querySelector(".drop-pv"); if (!f) return;
  pv.innerHTML = ""; const im = new Image(); im.src = URL.createObjectURL(f); im.onload = () => URL.revokeObjectURL(im.src); pv.appendChild(im);
  const fi = document.getElementById("fitimg"); if (fi && inp.name === "image") { fi.src = URL.createObjectURL(f); fi.hidden = false; }
  inp.closest("label").querySelector(".drop-tx b").textContent = f.name.length > 28 ? f.name.slice(0, 26) + "…" : f.name;
};
document.addEventListener("dragover", e => { const z = e.target.closest?.("[data-drop]"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", e => e.target.closest?.("[data-drop]")?.classList.remove("over"));
document.addEventListener("drop", e => { const z = e.target.closest?.("[data-drop]"); if (!z) return; e.preventDefault(); z.classList.remove("over"); const f = e.dataTransfer.files?.[0]; if (f) { const i = z.querySelector("input"), dt = new DataTransfer(); dt.items.add(f); i.files = dt.files; actions.filePrev(i); } });
