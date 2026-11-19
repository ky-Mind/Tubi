// Cek pembaruan aplikasi Android (APK) dari GitHub Releases ky-Mind/Tubi.
// Setiap rilis baru (tag vX.Y.Z dengan file .apk terlampir) memunculkan kotak "Pembaruan tersedia"
// dan notifikasi di lonceng pada APK yang versinya lebih lama. Versi web (Vercel) selalu terbaru, jadi tidak dicek.
import { openOverlay, closeOverlay, actions } from "./core.js";
import { esc, svg } from "./util.js";
import { playSound } from "./notif.js";

export const APP_VERSION = "1.1.1";   // samakan dengan versionName di android/app/build.gradle setiap rilis
const API = "https://api.github.com/repos/ky-Mind/Tubi/releases/latest";
const native = () => !!window.Capacitor?.isNativePlatform?.();
const angka = v => String(v || "").replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
const lebihBaru = (a, b) => { const x = angka(a), y = angka(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
let terakhir = null;

export async function cekUpdate(paksa) {
  if (!native() && !paksa) return null;
  try {
    const r = await fetch(API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json(), apk = (j.assets || []).find(a => /\.apk$/i.test(a.name));
    if (!apk || !lebihBaru(j.tag_name, APP_VERSION)) return null;
    terakhir = { versi: j.tag_name.replace(/^v/i, ""), nama: j.name || j.tag_name, catatan: String(j.body || "").slice(0, 1500), url: apk.browser_download_url, ukuran: apk.size };
    if (sessionStorage.getItem("tubi-update-nanti") !== terakhir.versi) tampil(terakhir);
    return terakhir;
  } catch { return null; }
}
// Catatan rilis Markdown sederhana → HTML aman (judul, poin, tebal)
const md = t => esc(t).replace(/^#{1,3} (.*)$/gm, "<b>$1</b>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^[-*] (.*)$/gm, "• $1").replace(/\n/g, "<br>");
function tampil(u) {
  playSound();
  openOverlay(`<div class="upd"><div class="upd-h"><img src="./tubi-icon.png" alt=""><div><small>Pembaruan tersedia</small><b>Tubi versi ${esc(u.versi)}</b><span>Versimu sekarang ${esc(APP_VERSION)} · ${(u.ukuran / 1048576).toFixed(1)} MB</span></div></div>
    ${u.catatan ? `<div class="upd-n">${md(u.catatan)}</div>` : ""}
    <div class="upd-a"><button class="btn ghost" data-act="updlater" data-v="${esc(u.versi)}">Nanti saja</button><button class="btn pri" data-act="updgo">${svg("download", 18)} Perbarui sekarang</button></div>
    <small class="muted">Setelah file APK terunduh, buka file itu lalu pilih <b>Perbarui</b>. Data dan akunmu tetap aman.</small></div>`);
}
actions.updlater = el => { sessionStorage.setItem("tubi-update-nanti", el.dataset.v); closeOverlay(); };
actions.updgo = () => { if (!terakhir) return; window.open(terakhir.url, "_system"); closeOverlay(); };
export function mulaiCekUpdate() {
  if (!native()) return;
  setTimeout(() => cekUpdate(), 4000);
  setInterval(() => cekUpdate(), 6 * 3600 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - (window.__tubiCek || 0) > 3600 * 1000) { window.__tubiCek = Date.now(); cekUpdate(); } });
}
