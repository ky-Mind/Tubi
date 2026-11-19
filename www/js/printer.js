// Cetak struk ke printer thermal Bluetooth (ESC/POS).
// - APK Tubi: plugin native PrinterBT (Bluetooth klasik/SPP, dipakai kebanyakan printer thermal 58/80 mm).
// - Browser: Web Bluetooth (printer BLE) di Chrome/Edge lewat HTTPS. Safari/iOS/Firefox belum didukung.
import { ls, rupiah, timeText, esc, svg, hpLokal } from "./util.js";
import { emit } from "./data.js";
import { openOverlay, closeOverlay, actions } from "./core.js";
const SERVICES = ["000018f0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000fee7-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", "e7810a71-73ae-499d-8c15-faa9aef0c3f2", "0000ae30-0000-1000-8000-00805f9b34fb", "00001800-0000-1000-8000-00805f9b34fb"];
let dev = null, chr = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NP = () => window.Capacitor?.isNativePlatform?.() ? window.Capacitor?.Plugins?.PrinterBT : null;
let nat = { on: false, nama: "" };
export const isNative = () => !!NP();
export const supported = () => !!NP() || !!navigator.bluetooth;
export const connected = () => NP() ? nat.on : !!(dev?.gatt?.connected && chr);
export const printerName = () => (NP() ? nat.nama : dev?.name) || ls.get("printer", {}).name || "";
export const width = () => (ls.get("paper", 58) === 80 ? 48 : 32);
export const setPaper = mm => ls.set("paper", mm);
// Alasan browser tidak bisa (untuk keterangan di Pengaturan)
export function alasanTidakDukung() {
  if (supported()) return "";
  const ua = navigator.userAgent;
  if (/Linux/.test(ua) && /Chrome\//.test(ua) && !/Android/.test(ua)) return "Chrome di Linux mematikan Web Bluetooth secara bawaan. Buka <b>chrome://flags/#enable-experimental-web-platform-features</b>, pilih <b>Enabled</b>, lalu mulai ulang Chrome. Cara paling mudah: cetak dari <b>aplikasi Tubi di HP Android</b>.";
  if (!window.isSecureContext) return "Web Bluetooth hanya jalan lewat HTTPS. Buka Tubi dari alamat https://.";
  return "Browser ini tidak mendukung Web Bluetooth. Gunakan <b>aplikasi Tubi di HP Android</b>, atau Chrome / Edge di Windows, macOS, atau Android. iPhone/iPad dan Firefox belum didukung — gunakan “Cetak lewat browser”.";
}

// ---------- APK (native) ----------
let pilihSelesai = null;
actions.btpilih = el => { const f = pilihSelesai; pilihSelesai = null; closeOverlay(); f?.({ alamat: el.dataset.a, nama: el.dataset.n }); };
actions.btsetelan = () => NP()?.bukaPengaturan();
function pilihPrinter(list) {
  return new Promise((ok, gagal) => {
    pilihSelesai = ok;
    const urut = [...list].sort((a, b) => (b.printer ? 1 : 0) - (a.printer ? 1 : 0));
    openOverlay(`<div class="sheet-head"><h3>${svg("bt", 20)} Pilih printer</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
      ${urut.length ? `<div class="bt-list">${urut.map(d => `<button class="bt-item" data-act="btpilih" data-a="${esc(d.alamat)}" data-n="${esc(d.nama)}"><span class="bt-ic">${svg(d.printer ? "printer" : "bt", 20)}</span><span class="sp"><b>${esc(d.nama)}</b><small>${esc(d.alamat)}${d.printer ? " · printer" : ""}</small></span></button>`).join("")}</div>` : `<div class="m-empty">${svg("bt", 34)}<b>Belum ada perangkat yang dipasangkan</b><span>Nyalakan printer, lalu pasangkan dulu di pengaturan Bluetooth HP (PIN biasanya 0000 atau 1234).</span></div>`}
      <p class="muted sm" style="margin:12px 0 8px">Printer tidak ada di daftar? Pasangkan dulu di pengaturan Bluetooth HP, lalu tekan Hubungkan lagi.</p>
      <button class="btn full" data-act="btsetelan">Buka pengaturan Bluetooth</button>`);
    const o = document.querySelector("#overlay");
    const awas = new MutationObserver(() => { if (o.hidden && pilihSelesai === ok) { pilihSelesai = null; awas.disconnect(); const e = new Error("dibatalkan"); e.name = "NotFoundError"; gagal(e); } else if (pilihSelesai !== ok) awas.disconnect(); });
    awas.observe(o, { attributes: true, attributeFilter: ["hidden"] });
  });
}
async function natSambung(alamat) {
  const r = await NP().hubungkan({ alamat });
  nat = { on: true, nama: r.nama || "Printer" }; ls.set("printer", { name: nat.nama, alamat }); emit("bt");
  return nat.nama;
}
async function natConnect() {
  const p = NP();
  const iz = await p.izin(); if (!iz.boleh) throw new Error("Izin Bluetooth ditolak. Izinkan \"Perangkat di sekitar\" untuk Tubi di pengaturan aplikasi HP.");
  const { perangkat } = await p.daftar();
  const pilih = await pilihPrinter(perangkat || []);
  return natSambung(pilih.alamat);
}
async function natEnsure() {
  if (nat.on) { const s = await NP().status().catch(() => ({})); if (s.terhubung) return; nat.on = false; }
  const simpan = ls.get("printer", {});
  if (simpan.alamat) { const iz = await NP().izin(); if (iz.boleh) { await natSambung(simpan.alamat); return; } }
  await natConnect();
}
const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };

// ---------- Browser (Web Bluetooth) ----------
async function bind(server) {
  for (const s of await server.getPrimaryServices()) {
    for (const c of await s.getCharacteristics()) { if (c.properties.write || c.properties.writeWithoutResponse) { chr = c; return; } }
  }
  throw new Error("Printer terhubung, tetapi tidak ada jalur tulis yang dikenali. Printer ini kemungkinan tipe Bluetooth klasik (SPP) yang tidak didukung browser — cetak dari aplikasi Tubi di HP Android.");
}
export async function connect() {
  if (NP()) return natConnect();
  if (!supported()) throw new Error(alasanTidakDukung().replace(/<[^>]+>/g, ""));
  dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  dev.addEventListener("gattserverdisconnected", () => { chr = null; });
  await bind(await dev.gatt.connect()); ls.set("printer", { name: dev.name || "Printer" }); return dev.name || "Printer";
}
async function ensure() {
  if (connected()) return;
  if (dev) { await bind(await dev.gatt.connect()); return; }
  throw new Error("Printer belum terhubung. Buka Pengaturan → Printer Bluetooth → Hubungkan.");
}
async function send(bytes) {
  if (NP()) {
    await natEnsure();
    try { await NP().kirim({ data: b64(bytes) }); }
    catch (e) { nat.on = false; const simpan = ls.get("printer", {}); if (!simpan.alamat) throw e; await natSambung(simpan.alamat); await NP().kirim({ data: b64(bytes) }); }
    return;
  }
  await ensure();
  for (let i = 0; i < bytes.length; i += 100) {
    const part = bytes.slice(i, i + 100);
    if (chr.properties.writeWithoutResponse) await chr.writeValueWithoutResponse(part); else await chr.writeValue(part);
    await sleep(30);
  }
}
// Hanya karakter yang dikenal printer thermal (ASCII). Baris baru dipertahankan; tanda baca umum diganti padanannya.
const GANTI = { "\u00a0": " ", "\u2014": "-", "\u2013": "-", "\u00b7": "-", "\u2022": "*", "\u00d7": "x", "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u2192": "->", "\u2713": "v" };
const ascii = s => String(s ?? "").replace(/[\u00a0\u2014\u2013\u00b7\u2022\u00d7\u2018\u2019\u201c\u201d\u2026\u2192\u2713]/g, c => GANTI[c]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
const enc = s => Uint8Array.from([...ascii(s)].map(c => c.charCodeAt(0)));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach(x => { o.set(x, i); i += x.length; }); return o; };
const cmd = (...b) => Uint8Array.from(b);
const wrap = (s, w) => { const out = []; String(s).split("\n").forEach(line => { let l = ascii(line); while (l.length > w) { let k = l.lastIndexOf(" ", w); if (k < 8) k = w; out.push(l.slice(0, k)); l = l.slice(k).trimStart(); } out.push(l); }); return out; };
const lr = (a, b, w) => { a = ascii(a); b = ascii(b); const gap = w - a.length - b.length; return gap > 0 ? a + " ".repeat(gap) + b : a.slice(0, Math.max(1, w - b.length - 1)) + " " + b; };

// ---------- Tata letak struk (editor di Pengaturan → Printer Bluetooth) ----------
// Struk = daftar blok yang bisa disusun bebas, seperti aplikasi printer thermal:
//   teks {isi, al l|c|r, big, b}   garis {ch}   kosong {n}   gambar {src, lebar %, al}
//   pelanggan {b}  alamat  catatan  item  rincian  total {big}  bayar
// Teks boleh berisi isian otomatis: {kode} {waktu} {nama} {hp} {alamat} {catatan} {total} {bayar} {item}
// Logo Tubi hitam-putih untuk struk (siap dicetak printer thermal)
export const LOGO_TUBI = "./assets/struk-logo.png";
export const DOTS = () => (width() === 48 ? 576 : 384);
export const JENIS = {
  teks: ["Teks", "Teks bebas: nama toko, alamat, promo…", "Teks"], gambar: ["Logo / gambar", "Dicetak hitam-putih", "Logo"], garis: ["Garis", "Pemisah", "Garis"], kosong: ["Baris kosong", "Jarak", "Jarak"],
  pelanggan: ["Nama & nomor pelanggan", "Otomatis dari pesanan", "Pelanggan"], alamat: ["Alamat pengantaran", "Otomatis dari pesanan", "Alamat"], catatan: ["Catatan pesanan", "Hanya bila ada catatan", "Catatan"],
  item: ["Daftar menu", "Jumlah, nama menu, harga", "Daftar menu"], rincian: ["Rincian biaya", "Subtotal, ongkir, pajak, diskon", "Rincian"], total: ["Total", "Total yang dibayar", "Total"], bayar: ["Cara bayar", "COD / transfer (lunas)", "Cara bayar"]
};
function blokDariLama(c) {   // pengaturan versi sebelumnya (centang) → blok
  const v = k => c[k] !== false, B = [];
  B.push({ jenis: "gambar", src: LOGO_TUBI, lebar: 40, al: "c" });
  B.push({ jenis: "teks", isi: c.nama ?? "TUBI", al: "c", big: c.besar !== false, b: true });
  if (c.info) B.push({ jenis: "teks", isi: c.info, al: "c" });
  if (v("kode")) B.push({ jenis: "teks", isi: "#{kode}  {waktu}", al: "c" });
  B.push({ jenis: "garis", ch: "-" });
  if (v("pelanggan")) B.push({ jenis: "pelanggan", b: true });
  if (v("alamat")) B.push({ jenis: "alamat" });
  if (v("catatan")) B.push({ jenis: "catatan" });
  B.push({ jenis: "garis", ch: "-" }, { jenis: "item" }, { jenis: "garis", ch: "-" });
  if (v("rincian")) B.push({ jenis: "rincian" });
  B.push({ jenis: "total" });
  if (v("bayar")) B.push({ jenis: "bayar" });
  B.push({ jenis: "kosong", n: 1 }, { jenis: "teks", isi: c.penutup ?? "Terima kasih sudah memesan di Tubi!", al: "c" });
  return B;
}
export const strukCfg = c => { c = c || {}; return { potong: c.potong !== false, blok: Array.isArray(c.blok) && c.blok.length ? c.blok : blokDariLama(c) }; };
export const blokBaru = jenis => ({ teks: { jenis, isi: "Teks baru", al: "c" }, gambar: { jenis, src: LOGO_TUBI, lebar: 40, al: "c" }, garis: { jenis, ch: "-" }, kosong: { jenis, n: 1 } }[jenis] || { jenis });
const bayarTeks = o => o.payment?.method === "transfer" ? `${o.payment?.via || "Transfer"}${o.payment?.status === "paid" ? " (lunas)" : ""}` : "COD";
const isian = (t, o) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => ({
  kode: o.id.slice(0, 6).toUpperCase(), waktu: timeText(o.createdAt), nama: o.customerName || "", hp: hpLokal(o.phone), alamat: o.address || "", catatan: o.note || "",
  total: rupiah(o.total), bayar: bayarTeks(o), item: String((o.items || []).reduce((n, i) => n + (+i.qty || 0), 0))
}[k] ?? m));
function isiStruk(o, c) {
  const L = [];
  c.blok.forEach(k => {
    const al = k.al || "l";
    if (k.jenis === "teks") L.push({ t: isian(k.isi, o), al, b: k.b, big: k.big });
    else if (k.jenis === "garis") L.push({ garis: (k.ch || "-").slice(0, 1) });
    else if (k.jenis === "kosong") for (let i = 0; i < Math.min(5, +k.n || 1); i++) L.push({ t: "" });
    else if (k.jenis === "gambar") { if (k.src) L.push({ img: k }); }
    else if (k.jenis === "pelanggan") L.push({ t: [o.customerName || "", hpLokal(o.phone)].filter(Boolean).join("  "), al, b: k.b, big: k.big });
    else if (k.jenis === "alamat") { if (o.address) L.push({ t: o.address, al, b: k.b }); }
    else if (k.jenis === "catatan") { if (o.note) L.push({ t: "Catatan: " + o.note, al, b: k.b }); }
    else if (k.jenis === "item") (o.items || []).forEach(i => L.push({ item: [`${i.qty}x ${i.name}`, rupiah(i.qty * i.price)], b: k.b }));
    else if (k.jenis === "rincian") {
      if (+o.subtotal && (+o.deliveryFee || +o.discount || +o.tax)) L.push({ lr: ["Subtotal", rupiah(o.subtotal)] });
      if (+o.deliveryFee) L.push({ lr: ["Ongkir", rupiah(o.deliveryFee)] });
      if (+o.tax) L.push({ lr: ["Pajak", rupiah(o.tax)] });
      if (+o.discount) L.push({ lr: ["Diskon", "-" + rupiah(o.discount)] });
    }
    else if (k.jenis === "total") L.push({ lr: ["TOTAL", rupiah(o.total)], b: true, big: k.big });
    else if (k.jenis === "bayar") L.push({ lr: ["Bayar", bayarTeks(o)], b: k.b });
  });
  return L;
}
// Blok → baris cetak (dipakai printer dan pratinjau, jadi hasilnya sama persis)
function susun(L, w) {
  const out = [];
  L.forEach(x => {
    const lebar = x.big ? Math.floor(w / 2) : w;
    if (x.img) out.push({ img: x.img });
    else if (x.garis) out.push({ s: x.garis.repeat(w) });
    else if (x.lr) out.push({ s: lr(x.lr[0], x.lr[1], lebar), b: x.b, big: x.big });
    else if (x.item) { const ls = wrap(x.item[0], w - 12); ls.forEach((l, k) => out.push({ s: k === ls.length - 1 ? lr(l, x.item[1], w) : l, b: x.b })); }
    else wrap(x.t, lebar).forEach(l => out.push({ s: l, al: x.al, b: x.b, big: x.big }));
  });
  return out;
}
// ---------- Gambar → hitam-putih (dithering Floyd–Steinberg) ----------
const cacheGambar = new Map();
const muatGambar = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Gambar struk gagal dimuat.")); i.src = src; });
async function gambarBW(src, lebarPx) {
  const kunci = lebarPx + "|" + src.length + "|" + src.slice(-40);
  if (cacheGambar.has(kunci)) return cacheGambar.get(kunci);
  const im = await muatGambar(src), w = Math.max(8, Math.min(lebarPx, 576)) & ~7, h = Math.max(1, Math.round(im.height * w / im.width));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), px = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) px[i] = d.data[i * 4] * .299 + d.data[i * 4 + 1] * .587 + d.data[i * 4 + 2] * .114;
  const bpr = w / 8, bits = new Uint8Array(bpr * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, lama = px[i], hitam = lama < 128, err = lama - (hitam ? 0 : 255);
    if (hitam) bits[y * bpr + (x >> 3)] |= 0x80 >> (x & 7);
    const v = hitam ? 0 : 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
    if (x + 1 < w) px[i + 1] += err * 7 / 16;
    if (y + 1 < h) { if (x > 0) px[i + w - 1] += err * 3 / 16; px[i + w] += err * 5 / 16; if (x + 1 < w) px[i + w + 1] += err / 16; }
  }
  g.putImageData(d, 0, 0);
  const hasil = { w, h, bits, url: cv.toDataURL("image/png") };
  cacheGambar.set(kunci, hasil); return hasil;
}
const lebarGambar = k => Math.round(DOTS() * Math.min(100, Math.max(20, +k.lebar || 60)) / 100);
// Unggahan logo diperkecil dulu (maks 576 px, latar putih) supaya ringan disimpan di pengaturan
export async function siapkanGambar(file) {
  const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  const im = await muatGambar(url), w = Math.min(576, im.width), h = Math.round(im.height * w / im.width);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
  return cv.toDataURL("image/png").length < 300000 ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", .9);
}
async function keBytes(rows, c) {
  const parts = [cmd(0x1b, 0x40)];
  for (const r of rows) {
    if (r.img) {
      const g = await gambarBW(r.img.src, lebarGambar(r.img)), bpr = g.w / 8;
      parts.push(cmd(0x1b, 0x61, r.img.al === "l" ? 0 : r.img.al === "r" ? 2 : 1));
      for (let y = 0; y < g.h; y += 64) {   // dikirim per pita 64 baris supaya buffer printer tidak penuh
        const t = Math.min(64, g.h - y);
        parts.push(cmd(0x1d, 0x76, 0x30, 0, bpr & 255, bpr >> 8, t & 255, t >> 8), g.bits.subarray(y * bpr, (y + t) * bpr));
      }
      continue;
    }
    parts.push(cmd(0x1b, 0x61, r.al === "c" ? 1 : r.al === "r" ? 2 : 0), cmd(0x1b, 0x45, r.b ? 1 : 0), cmd(0x1d, 0x21, r.big ? 0x11 : 0), enc(r.s), cmd(0x0a));
  }
  parts.push(cmd(0x1d, 0x21, 0), cmd(0x1b, 0x45, 0), cmd(0x1b, 0x61, 0), cmd(0x1b, 0x64, 4));
  if (c.potong) parts.push(cmd(0x1d, 0x56, 0x42, 0));
  return cat(...parts);
}
export async function receiptBytes(o, cfg) { const c = strukCfg(cfg); return keBytes(susun(isiStruk(o, c), width()), c); }
const escH = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
// Pratinjau struk (HTML), lebar kertas & gambar hitam-putih sama seperti hasil printer
export async function strukHtml(o, cfg) {
  const c = strukCfg(cfg), w = width(), rows = susun(isiStruk(o, c), w), h = [];
  for (const r of rows) {
    if (r.img) { try { const g = await gambarBW(r.img.src, lebarGambar(r.img)); h.push(`<div class="sk-img ${r.img.al || "c"}"><img src="${g.url}" style="width:${(g.w / DOTS() * 100).toFixed(1)}%" alt=""></div>`); } catch { h.push(`<div class="sk c">[gambar gagal dimuat]</div>`); } continue; }
    h.push(`<div class="sk${r.al === "c" ? " c" : r.al === "r" ? " r" : ""}${r.b ? " b" : ""}${r.big ? " big" : ""}">${escH(r.s) || "&nbsp;"}</div>`);
  }
  return `<div class="struk" style="--kol:${w}">${h.join("")}${c.potong ? `<div class="sk-potong"></div>` : ""}</div>`;
}
// Isi elemen dengan pratinjau (tanpa membuat tampilan menunggu)
export const isiPratinjau = (el, o, cfg) => { if (!el) return; strukHtml(o, cfg).then(h => { el.innerHTML = h; }).catch(e => { el.textContent = e.message; }); };
export const printOrder = async (o, cfg) => send(await receiptBytes(o, cfg));
export const printTest = async cfg => send(await receiptBytes(CONTOH, cfg));
// Contoh pesanan untuk pratinjau & tes cetak
export const CONTOH = { id: "contoh123", createdAt: Date.now(), customerName: "Budi", phone: "6281234567890", address: "Jl. Melati No. 5, Coblong, Bandung", note: "Pedas sedang", items: [{ qty: 2, name: "Roti kukus cokelat keju", price: 8000 }, { qty: 1, name: "Cilok dan tahu", price: 10000 }], subtotal: 26000, deliveryFee: 3000, discount: 0, tax: 0, total: 29000, payment: { method: "transfer", via: "DANA", status: "paid" } };
export const disconnect = () => { if (NP()) { NP().putus().catch(() => {}); nat.on = false; ls.set("printer", {}); return; } try { dev?.gatt?.disconnect(); } catch {} chr = null; };
