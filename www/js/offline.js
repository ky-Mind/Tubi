// Layar "Kamu sedang offline": muncul saat HP tidak tersambung internet, hilang sendiri saat tersambung lagi.
import { toast } from "./util.js";

const WIFI_OFF = '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.9 5.2A15 15 0 0 1 22 8.8M5 12.6a10 10 0 0 1 4.3-2.4M14.6 10.3A10 10 0 0 1 19 12.6M8.6 16.3a5 5 0 0 1 6.8 0"/><circle cx="12" cy="20" r="1"/><path d="M3 3l18 18"/></svg>';
let el = null, pernahOffline = false;

function tampil() {
  if (el) return;
  el = document.createElement("div");
  el.className = "offline"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-live", "assertive");
  el.innerHTML = `<div class="off-card"><div class="off-ic">${WIFI_OFF}</div><h2>Kamu sedang offline</h2>
    <p>Sepertinya HP-mu tidak tersambung ke internet. Nyalakan data seluler atau Wi‑Fi, nanti Tubi tersambung lagi otomatis.</p>
    <button type="button" class="btn pri off-retry">Coba lagi</button><small class="off-st"></small></div>`;
  el.querySelector(".off-retry").addEventListener("click", cek);
  document.body.appendChild(el); document.body.classList.add("locked");
  requestAnimationFrame(() => el?.classList.add("show"));
}
function sembunyi() {
  if (!el) return;
  const e = el; el = null; e.classList.remove("show"); document.body.classList.remove("locked");
  setTimeout(() => e.remove(), 250);
}
// navigator.onLine kadang "true" padahal tidak ada internet → pastikan dengan permintaan kecil
async function adaInternet() {
  if (!navigator.onLine) return false;
  try { await fetch("https://www.gstatic.com/generate_204", { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(5000) }); return true; }
  catch { return false; }
}
async function cek() {
  const st = el?.querySelector(".off-st"); if (st) st.textContent = "Memeriksa koneksi…";
  if (await adaInternet()) { sembunyi(); if (pernahOffline) toast("Tersambung lagi. Selamat jajan!"); pernahOffline = false; }
  else { pernahOffline = true; tampil(); const s = el?.querySelector(".off-st"); if (s) s.textContent = "Masih offline. Coba lagi sebentar lagi ya."; el?.querySelector(".off-card")?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 }); }
}
export function mulaiOffline() {
  addEventListener("offline", () => { pernahOffline = true; tampil(); });
  addEventListener("online", cek);
  if (!navigator.onLine) { pernahOffline = true; tampil(); }
}
