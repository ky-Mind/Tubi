// Pintasan keyboard untuk laptop/komputer. Tekan ? untuk melihat daftarnya.
// Di HP (layar sentuh) tidak ada yang berubah. Ctrl+K dan Ctrl+B admin ada di palette.js.
import { S } from "./data.js";
import { actions, go, path, openOverlay, closeOverlay } from "./core.js";
import { $, svg } from "./util.js";

const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = mac ? "⌘" : "Ctrl";
const ALT = mac ? "⌥" : "Alt";
const admin = () => path().startsWith("/admin");

const ADMIN_HAL = [["/admin", "Dashboard"], ["/admin/orders", "Pesanan"], ["/admin/chat", "Chat"], ["/admin/products", "Produk"], ["/admin/reports", "Laporan"], ["/admin/settings", "Pengaturan"]];
const TOKO_HAL = [["/", "Beranda"], ["/orders", "Pesanan saya"], ["/chat", "Chat"], ["/account", "Akun saya"]];

function daftar() {
  const hal = admin() ? ADMIN_HAL : TOKO_HAL;
  const umum = [["Lihat daftar pintasan ini", ["?"]], ["Cari", ["/"]], ["Notifikasi", [ALT, "N"]], ["Ganti tema terang / gelap", [ALT, "T"]], ["Tutup panel / jendela", ["Esc"]]];
  const khusus = admin()
    ? [["Palet perintah (cari apa saja)", [MOD, "K"]], ["Buka / tutup sidebar", [MOD, "B"]], ["Tambah produk baru", [ALT, "P"]], ["Lihat toko", [ALT, "S"]]]
    : [["Buka keranjang", [ALT, "K"]], ["Checkout", [ALT, "C"]], ...(S.isAdmin ? [["Masuk dashboard admin", [ALT, "A"]]] : [])];
  return { hal: hal.map(([h, l], i) => [l, [ALT, String(i + 1)], h]), umum, khusus };
}
const baris = ([l, k]) => `<div class="kbd-row"><span>${l}</span><span>${k.map(x => `<kbd>${x}</kbd>`).join("")}</span></div>`;
actions.pintasan = () => {
  const d = daftar();
  openOverlay(`<div class="sheet-head"><h3>${svg("keyboard", 20)} Pintasan keyboard</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="kbd-list"><div><h4>Pindah halaman</h4>${d.hal.map(baris).join("")}</div>
  <div><h4>${admin() ? "Admin" : "Belanja"}</h4>${d.khusus.map(baris).join("")}</div><div><h4>Umum</h4>${d.umum.map(baris).join("")}</div></div>`);
};

const mengetik = t => t?.closest?.("input,textarea,select,[contenteditable]");
document.addEventListener("keydown", e => {
  if (e.defaultPrevented || e.repeat) return;
  const ketik = mengetik(e.target);
  // Alt + angka / huruf (pakai e.code supaya ⌥ di Mac juga jalan)
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const c = e.code, d = daftar();
    const angka = /^Digit([1-9])$/.exec(c);
    if (angka) { const it = d.hal[+angka[1] - 1]; if (it) { e.preventDefault(); go(it[2]); } return; }
    const aksi = {
      KeyN: () => S.user && actions.notifs?.(),
      KeyT: () => actions.themetoggle?.(),
      KeyK: () => !admin() && actions.cart?.(),
      KeyC: () => !admin() && S.cart.length && go("/checkout"),
      KeyA: () => S.isAdmin && go("/admin"),
      KeyP: () => admin() && (go("/admin/products"), setTimeout(() => actions.pform?.({ dataset: {} }), 150)),
      KeyS: () => admin() && go("/")
    }[c];
    if (aksi) { e.preventDefault(); aksi(); }
    return;
  }
  if (ketik || e.ctrlKey || e.metaKey) return;
  if (e.key === "?") { e.preventDefault(); $("#overlay .kbd-list") ? closeOverlay() : actions.pintasan(); }
  else if (e.key === "/") {
    e.preventDefault();
    if (admin()) { actions.palette?.(); return; }
    const cari = () => { const q = $("#q"); if (q) { q.focus(); q.select(); } };
    if (path() !== "/") { go("/"); setTimeout(cari, 200); } else cari();
  }
});
