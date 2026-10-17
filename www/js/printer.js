// Cetak struk ke printer thermal Bluetooth (BLE) lewat Web Bluetooth + ESC/POS.
// Berjalan di Chrome/Edge (Android & desktop) lewat HTTPS. Tidak didukung Safari/iOS/Firefox.
import { ls, rupiah, timeText } from "./util.js";
const SERVICES = ["000018f0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000fee7-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", "e7810a71-73ae-499d-8c15-faa9aef0c3f2", "0000ae30-0000-1000-8000-00805f9b34fb", "00001800-0000-1000-8000-00805f9b34fb"];
let dev = null, chr = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
export const supported = () => !!navigator.bluetooth;
export const connected = () => !!(dev?.gatt?.connected && chr);
export const printerName = () => dev?.name || ls.get("printer", {}).name || "";
export const width = () => (ls.get("paper", 58) === 80 ? 48 : 32);
export const setPaper = mm => ls.set("paper", mm);

async function bind(server) {
  for (const s of await server.getPrimaryServices()) {
    for (const c of await s.getCharacteristics()) { if (c.properties.write || c.properties.writeWithoutResponse) { chr = c; return; } }
  }
  throw new Error("Printer terhubung, tetapi tidak ada jalur tulis yang dikenali. Printer ini kemungkinan tipe Bluetooth klasik (SPP) yang tidak didukung browser.");
}
export async function connect() {
  if (!supported()) throw new Error("Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge (Android atau desktop) lewat HTTPS.");
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
  await ensure();
  for (let i = 0; i < bytes.length; i += 100) {
    const part = bytes.slice(i, i + 100);
    if (chr.properties.writeWithoutResponse) await chr.writeValueWithoutResponse(part); else await chr.writeValue(part);
    await sleep(30);
  }
}
const ascii = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
const enc = s => Uint8Array.from([...ascii(s)].map(c => c.charCodeAt(0)));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; a.forEach(x => { o.set(x, i); i += x.length; }); return o; };
const cmd = (...b) => Uint8Array.from(b);
const wrap = (s, w) => { const out = []; String(s).split("\n").forEach(line => { let l = ascii(line); while (l.length > w) { let k = l.lastIndexOf(" ", w); if (k < 8) k = w; out.push(l.slice(0, k)); l = l.slice(k).trimStart(); } out.push(l); }); return out; };
const lr = (a, b, w) => { a = ascii(a); b = ascii(b); const gap = w - a.length - b.length; return gap > 0 ? a + " ".repeat(gap) + b : a.slice(0, Math.max(1, w - b.length - 1)) + " " + b; };

export function receiptBytes(o, shopName = "TUBI") {
  const w = width(), line = "-".repeat(w), parts = [cmd(0x1b, 0x40), cmd(0x1b, 0x61, 1), cmd(0x1b, 0x45, 1), cmd(0x1d, 0x21, 0x11), enc(shopName + "\n"), cmd(0x1d, 0x21, 0), cmd(0x1b, 0x45, 0),
    enc(`#${o.id.slice(0, 6).toUpperCase()}  ${timeText(o.createdAt)}\n`), cmd(0x1b, 0x61, 0), enc(line + "\n")];
  wrap(`${o.customerName || ""}  ${o.phone || ""}`, w).forEach(l => parts.push(enc(l + "\n")));
  wrap(o.address || "", w).forEach(l => parts.push(enc(l + "\n"))); parts.push(enc(line + "\n"));
  (o.items || []).forEach(i => { wrap(`${i.qty}x ${i.name}`, w - 10).forEach((l, k, a) => parts.push(enc((k === a.length - 1 ? lr(l, rupiah(i.qty * i.price), w) : l) + "\n"))); });
  parts.push(enc(line + "\n"));
  if (+o.deliveryFee) parts.push(enc(lr("Ongkir", rupiah(o.deliveryFee), w) + "\n"));
  if (+o.discount) parts.push(enc(lr("Diskon", "-" + rupiah(o.discount), w) + "\n"));
  parts.push(cmd(0x1b, 0x45, 1), enc(lr("TOTAL", rupiah(o.total), w) + "\n"), cmd(0x1b, 0x45, 0));
  parts.push(enc(lr("Bayar", o.payment?.method === "transfer" ? (o.payment?.status === "paid" ? "Transfer (lunas)" : "Transfer") : "COD", w) + "\n"), cmd(0x1b, 0x61, 1), enc("\nTerima kasih!\n"), cmd(0x1b, 0x64, 4), cmd(0x1d, 0x56, 0x42, 0));
  return cat(...parts);
}
export const printOrder = (o, shop) => send(receiptBytes(o, shop));
export const printTest = () => send(cat(cmd(0x1b, 0x40), cmd(0x1b, 0x61, 1), cmd(0x1b, 0x45, 1), enc("TUBI\nTes printer berhasil\n"), cmd(0x1b, 0x45, 0), enc("-".repeat(width()) + "\n"), cmd(0x1b, 0x64, 4)));
export const disconnect = () => { try { dev?.gatt?.disconnect(); } catch {} chr = null; };
