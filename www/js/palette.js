// Palet perintah admin (Ctrl+K) & pintasan keyboard (Ctrl+B = sembunyikan/tampilkan sidebar).
import { S, isMain } from "./data.js";
import { actions, go, openOverlay, closeOverlay } from "./core.js";
import { $, $$, esc, ls, svg, rupiah } from "./util.js";

export const sideOff = () => ls.get("sideoff", false);
export function applySide() { document.body.classList.toggle("side-off", !!sideOff()); }
actions.sidebar = () => { ls.set("sideoff", !sideOff()); applySide(); };

let items = [], sel = 0;
const NAVS = [["/admin", "Dashboard", "beranda ringkasan home"], ["/admin/orders", "Pesanan", "order transaksi antar"], ["/admin/chat", "Chat pelanggan", "pesan balas"], ["/admin/products", "Produk", "menu katalog barang stok"],
  ["/admin/reports", "Omzet & laporan", "pendapatan keuntungan penjualan csv"], ["/admin/settings", "Pengaturan", "toko ongkir voucher pembayaran tampilan hero"]];
function build() {
  const out = NAVS.map(([h, l, k]) => ({ g: "Buka halaman", l, k, run: () => go(h) }));
  out.push({ g: "Aksi", l: "Tambah produk baru", k: "produk tambah menu baru", run: () => { go("/admin/products"); setTimeout(() => actions.pform({ dataset: {} }), 150); } },
    { g: "Aksi", l: "Cek sistem (tes koneksi)", k: "diagnosa tes firestore", run: () => { go("/admin/settings"); setTimeout(() => actions.diag?.(), 400); } },
    { g: "Aksi", l: "Sembunyikan / tampilkan sidebar", k: "sidebar menu ctrl b", run: () => actions.sidebar() },
    { g: "Aksi", l: "Ganti tema terang / gelap", k: "mode gelap terang dark light", run: () => actions.themetoggle() },
    { g: "Aksi", l: "Lihat toko (tampilan pelanggan)", k: "toko pelanggan customer", run: () => go("/") },
    { g: "Aksi", l: "Kirim pesan tes WhatsApp", k: "wa bot tes whatsapp", run: () => { go("/admin/settings"); setTimeout(() => $('[data-act="wacmd"][data-a="test"]')?.click(), 400); } },
    { g: "Aksi", l: "Hubungkan printer Bluetooth", k: "printer bluetooth struk cetak", run: () => { go("/admin/settings"); setTimeout(() => actions.btconnect?.(), 400); } },
    { g: "Aksi", l: "Keluar dari akun", k: "logout keluar", run: () => actions.logout() });
  S.products.forEach(p => out.push({ g: "Produk", l: p.name, k: `${p.category || ""} ${p.price}`, h: rupiah(p.price), run: () => { go("/admin/products"); setTimeout(() => actions.pform({ dataset: { id: p.id } }), 150); } }));
  S.orders.slice(0, 40).forEach(o => out.push({ g: "Pesanan", l: `#${o.id.slice(0, 6).toUpperCase()} · ${o.customerName || "Pelanggan"}`, k: `${o.phone || ""} ${o.address || ""} ${o.status || ""}`, h: rupiah(o.total), run: () => { go("/admin/orders"); } }));
  return out;
}
const match = (it, q) => { const t = `${it.l} ${it.k || ""} ${it.g}`.toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => t.includes(w)); };
function paint() {
  const q = $("#pq")?.value || "", list = items.filter(i => match(i, q)).slice(0, 30); sel = Math.min(sel, Math.max(0, list.length - 1));
  let g = "", h = "";
  list.forEach((i, n) => { if (i.g !== g) { g = i.g; h += `<div class="pg">${esc(g)}</div>`; } h += `<button class="pi ${n === sel ? "on" : ""}" data-pi="${n}"><span>${esc(i.l)}</span>${i.h ? `<small class="muted">${esc(i.h)}</small>` : ""}</button>`; });
  $("#plist").innerHTML = h || `<div class="empty" style="border:0">Tidak ada hasil.</div>`; $("#plist").__list = list;
}
export function openPalette() {
  if (!S.isAdmin) return; items = build(); sel = 0;
  openOverlay(`<div class="pal"><div class="pal-in">${svg("search", 20)}<input id="pq" placeholder="Ketik perintah, halaman, produk, atau pesanan…" autocomplete="off"><kbd>Esc</kbd></div><div id="plist" class="pal-list"></div><div class="pal-ft muted xs">↑↓ pilih · Enter jalankan · Ctrl+K buka · Ctrl+B sidebar</div></div>`, "palette");
  paint(); setTimeout(() => $("#pq")?.focus(), 30);
}
const run = n => { const it = $("#plist").__list?.[n]; if (!it) return; closeOverlay(); setTimeout(() => it.run(), 60); };
document.addEventListener("input", e => { if (e.target.id === "pq") { sel = 0; paint(); } });
document.addEventListener("click", e => { const b = e.target.closest("[data-pi]"); if (b) run(+b.dataset.pi); });
document.addEventListener("keydown", e => {
  if (!S.isAdmin) return; const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); $("#pq") ? closeOverlay() : openPalette(); }
  else if ((e.ctrlKey || e.metaKey) && k === "b" && location.hash.startsWith("#/admin")) { e.preventDefault(); actions.sidebar(); }
  else if ($("#pq") && ["arrowdown", "arrowup", "enter"].includes(k)) {
    e.preventDefault(); const n = ($("#plist").__list || []).length;
    if (k === "enter") run(sel); else { sel = (sel + (k === "arrowdown" ? 1 : -1) + n) % Math.max(1, n); paint(); $(".pi.on")?.scrollIntoView({ block: "nearest" }); }
  }
});
actions.palette = () => openPalette();
