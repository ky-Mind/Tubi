// Katalog e-wallet & bank + "salin nomor lalu buka aplikasinya".
// Di APK Tubi: plugin bawaan BukaAplikasi membuka aplikasi bila terpasang, kalau belum → Play Store.
// Di Chrome Android: lewat tautan intent:// (otomatis ke Play Store bila belum terpasang). Di komputer: buka halaman Play Store.
import { esc, toast } from "./util.js";

export const PROVIDERS = [
  // e-wallet
  { key: "gopay", name: "GoPay", type: "ewallet", pkg: "com.gojek.gopay", color: "#00AED6" },
  { key: "ovo", name: "OVO", type: "ewallet", pkg: "ovo.id", color: "#4C3494" },
  { key: "dana", name: "DANA", type: "ewallet", pkg: "id.dana", color: "#118EEA" },
  { key: "shopeepay", name: "ShopeePay", type: "ewallet", pkg: "com.shopeepay.id", color: "#EE4D2D" },
  { key: "linkaja", name: "LinkAja", type: "ewallet", pkg: "com.telkom.mwallet", color: "#E82127" },
  { key: "astrapay", name: "AstraPay", type: "ewallet", pkg: "com.ada.astrapay", color: "#1D4F91" },
  { key: "isaku", name: "i.saku", type: "ewallet", pkg: "com.isaku.app", color: "#F15A24" },
  // bank
  { key: "bca", name: "BCA", type: "bank", pkg: "com.bca", color: "#0060AF", app: "BCA mobile" },
  { key: "mandiri", name: "Bank Mandiri", type: "bank", pkg: "id.bmri.livin", color: "#003D79", app: "Livin' by Mandiri" },
  { key: "bri", name: "BRI", type: "bank", pkg: "id.co.bri.brimo", color: "#00529C", app: "BRImo" },
  { key: "bni", name: "BNI", type: "bank", pkg: "id.bni.wondr", color: "#F15A23", app: "wondr by BNI" },
  { key: "bsi", name: "BSI", type: "bank", pkg: "com.bsm.activity2", color: "#00A39D", app: "BSI Mobile" },
  { key: "cimb", name: "CIMB Niaga", type: "bank", pkg: "id.co.cimbniaga.mobile.android", color: "#7A0019", app: "OCTO" },
  { key: "permata", name: "PermataBank", type: "bank", pkg: "net.myinfosys.PermataMobileX", color: "#0B8C3C", app: "PermataMobile X" },
  { key: "danamon", name: "Danamon", type: "bank", pkg: "com.dbank.mobile", color: "#F7941D", app: "D-Bank PRO" },
  { key: "maybank", name: "Maybank", type: "bank", pkg: "id.com.uiux.mobile", color: "#C8A800", app: "Maybank2u ID" },
  { key: "seabank", name: "SeaBank", type: "bank", pkg: "id.co.bankbkemobile.digitalbank", color: "#FF6A00" },
  { key: "jago", name: "Bank Jago", type: "bank", pkg: "com.jago.digitalBanking", color: "#F7B500" },
  { key: "blu", name: "blu by BCA Digital", type: "bank", pkg: "com.bcadigital.blu", color: "#00B4E6" },
  { key: "allo", name: "Allo Bank", type: "bank", pkg: "com.alloapp.yump", color: "#E31E24" },
  { key: "jenius", name: "Jenius", type: "bank", pkg: "com.btpn.dc", color: "#00A3E0" },
  { key: "linebank", name: "LINE Bank", type: "bank", pkg: "id.co.linebank", color: "#06C755" },
  { key: "lain", name: "Lainnya", type: "other", pkg: "", color: "#806f68" }
];
export const prov = k => PROVIDERS.find(p => p.key === k) || null;
// Tebak penyedia dari nama lama (data sebelum ada katalog), mis. "DANA", "BCA"
export const provOf = m => prov(m?.provider) || PROVIDERS.find(p => p.key !== "lain" && new RegExp(`\\b${p.name.split(" ")[0]}\\b`, "i").test(m?.name || "")) || null;
const inisial = n => n.replace(/[^A-Za-z0-9. ]/g, "").split(/[ .]+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
export const badge = (m, size = 40) => { const p = provOf(m), nama = p?.name || m?.name || "Transfer";
  return `<span class="pv" style="--pv:${p?.color || "#806f68"};width:${size}px;height:${size}px;font-size:${Math.round(size * .34)}px">${esc(p?.key === "dana" ? "DANA" : p?.key === "ovo" ? "OVO" : inisial(nama))}</span>`; };
export const nomorOf = m => m?.number || String(m?.detail || "").split(/\s|a\.n\./i).find(x => /\d{5,}/.test(x)) || "";
export const atasNamaOf = m => m?.holder || (String(m?.detail || "").match(/a\.?n\.?\s*(.+)$/i)?.[1] || "").trim();
export const appName = p => p?.app || p?.name || "aplikasi";

export async function salin(t) {
  try { await navigator.clipboard.writeText(String(t)); return true; }
  catch { try { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; } catch { return false; } }
}
const play = pkg => `https://play.google.com/store/apps/details?id=${pkg}`;
export async function bukaAplikasi(pkg) {
  if (!pkg) return;
  const plug = window.Capacitor?.Plugins?.BukaAplikasi;
  if (plug) { try { const r = await plug.buka({ paket: pkg }); if (!r?.terpasang) toast("Aplikasinya belum terpasang. Silakan pasang dari Play Store dulu."); return; } catch {} }
  if (/Android/i.test(navigator.userAgent)) { location.href = `intent://#Intent;package=${pkg};S.browser_fallback_url=${encodeURIComponent(play(pkg))};end`; return; }
  window.open(play(pkg), "_blank", "noopener");
}
