// Cek pembaruan aplikasi Android (APK) dari GitHub Releases ky-Mind/Tubi.
// Setiap rilis baru (tag vX.Y.Z dengan file .apk terlampir) memunculkan kotak "Pembaruan tersedia"
// dan notifikasi di lonceng pada APK yang versinya lebih lama. Versi web (Vercel) selalu terbaru, jadi tidak dicek.
import { openOverlay, closeOverlay, actions } from "./core.js";
import { esc, svg } from "./util.js";
import { playSound, notifSistem } from "./notif.js";

export const APP_VERSION = "1.3.8";   // samakan dengan versionName di android/app/build.gradle setiap rilis
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
    // Kabari lewat notifikasi HP sekali untuk tiap versi baru
    try { if (localStorage.getItem("tubi-update-dikabari") !== terakhir.versi) { localStorage.setItem("tubi-update-dikabari", terakhir.versi); notifSistem(`Tubi ${terakhir.versi} sudah tersedia`, "Buka Tubi lalu ketuk Perbarui sekarang."); } } catch {}
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
    <small class="muted">Pembaruan diunduh dan dipasang langsung dari aplikasi. Data dan akunmu tetap aman.</small></div>`);
}
actions.updlater = el => { sessionStorage.setItem("tubi-update-nanti", el.dataset.v); closeOverlay(); };
// APK 1.2.0+: unduh & pasang langsung dari dalam aplikasi (plugin Pembaruan). Versi lama: lewat browser.
const PB = () => window.Capacitor?.Plugins?.Pembaruan;
let dengar = null;
function progres(persen, teks) {
  const box = document.querySelector(".upd-a"); if (!box) return;
  box.innerHTML = `<div class="upd-p"><div class="upd-bar"><i style="width:${Math.max(3, persen)}%"></i></div><span>${esc(teks)}</span></div>`;
}
actions.updgo = async () => {
  if (!terakhir) return;
  const pb = PB();
  if (!pb) { window.open(terakhir.url, "_system"); closeOverlay(); return; }
  const r = await pb.unduh({ url: terakhir.url, versi: terakhir.versi });
  if (r?.perluIzin) {
    const box = document.querySelector(".upd-a");
    if (box) box.innerHTML = `<div class="upd-izin"><b>Satu langkah lagi</b><span>Izinkan Tubi memasang pembaruan: ketuk tombol di bawah, nyalakan <b>Izinkan dari sumber ini</b>, lalu kembali dan ketuk <b>Perbarui sekarang</b> lagi.</span>
      <div class="upd-a2"><button class="btn ghost" data-act="updizin">Buka pengaturan izin</button><button class="btn pri" data-act="updgo">${svg("download", 18)} Perbarui sekarang</button></div></div>`;
    return;
  }
  progres(0, "Mengunduh pembaruan…");
  dengar?.remove?.();
  dengar = await pb.addListener("progres", d => {
    if (d.status === "unduh") progres(d.persen, `Mengunduh… ${d.persen}%`);
    else if (d.status === "selesai") { progres(100, "Selesai! Ketuk Perbarui di layar pemasangan."); setTimeout(() => {
      const box = document.querySelector(".upd-a"); if (box) box.innerHTML = `<button class="btn pri" data-act="updpasang">${svg("download", 18)} Pasang pembaruan</button>`; }, 1500); }
    else if (d.status === "gagal") { const box = document.querySelector(".upd-a"); if (box) box.innerHTML = `<span class="muted sm">Unduhan gagal. Periksa internet lalu coba lagi.</span><button class="btn pri" data-act="updgo">Coba lagi</button>`; }
  });
};
actions.updizin = () => PB()?.bukaIzin();
actions.updpasang = () => PB()?.pasangUlang().catch(() => actions.updgo());
export function mulaiCekUpdate() {
  if (!native()) return;
  setTimeout(() => cekUpdate(), 4000);
  setInterval(() => cekUpdate(), 6 * 3600 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - (window.__tubiCek || 0) > 3600 * 1000) { window.__tubiCek = Date.now(); cekUpdate(); } });
}
