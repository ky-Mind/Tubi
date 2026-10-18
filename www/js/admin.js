import { db, F, firebaseConfig, FIXED_ADMINS } from "./firebase.js";
import { S, emit, openThread, avail, ratingOf, statusOf, STATUS_LABEL, STATUSES, isMain, payMethods } from "./data.js";
import { actions, forms, live, go, openOverlay, closeOverlay, repaint } from "./core.js";
import { $, $$, esc, rupiah, svg, stars, toast, timeText, ago, secs, initial, normPhone, compressImage, ls } from "./util.js";
import { msgsHtml, chatForm, toEnd, markRead } from "./chat.js";
import { img, imgStyle } from "./customer.js";
import { ask, confirmBox, dropzone } from "./ui.js";
import { viewer, mapsDir, mapsView } from "./map.js";
import * as BT from "./printer.js";

const pic = p => img(p) ? `<img src="${esc(img(p))}" alt="" ${imgStyle(p)}>` : "🍢";
const path = () => location.hash.slice(1) || "/";
export const TITLES = { "/admin": "Dashboard", "/admin/orders": "Pesanan", "/admin/chat": "Chat Pelanggan", "/admin/products": "Produk", "/admin/reports": "Omzet & Laporan", "/admin/settings": "Pengaturan", "/admin/more": "Menu lainnya" };
const pending = () => S.orders.filter(o => statusOf(o.status) === "menunggu").length;
const unreadChats = () => S.chats.reduce((a, c) => a + (+c.unreadAdmin || 0), 0);
export const waState = () => { const w = S.wa; if (!w) return "offline"; return (Date.now() - secs(w.updatedAt) * 1000) < 240000 ? (w.state || "offline") : "offline"; };
const WA_LABEL = { offline: "Offline", starting: "Memulai", connecting: "Menghubungkan", qr: "Scan QR", pairing: "Kode pairing", connected: "Terhubung", logged_out: "Logout", error: "Error" };
const setSettings = d => F.setDoc(F.doc(db, "settings", "store"), d, { merge: true });

// ===== Shell =====
const LINKS = [["/admin", "grid", "Dashboard"], ["/admin/orders", "bag", "Pesanan"], ["/admin/chat", "chat", "Chat"], ["/admin/products", "store", "Produk"], ["/admin/reports", "chart", "Laporan"], ["/admin/settings", "cog", "Pengaturan"]];
const badgeFor = h => h === "/admin/orders" ? pending() : h === "/admin/chat" ? unreadChats() : 0;
export function shell() {
  const on = h => path() === h || (h === "/admin/settings" && path().startsWith("/admin/settings"));
  const side = () => LINKS.map(([h, ic, lb]) => `<a href="#${h}" class="${on(h) ? "on" : ""}">${svg(ic, 20)}${lb}${badgeFor(h) ? `<span class="badge">${badgeFor(h)}</span>` : ""}</a>`).join("");
  const nav = () => [["/admin", "grid", "Dashboard"], ["/admin/orders", "bag", "Pesanan"], ["/admin/chat", "chat", "Chat"], ["/admin/products", "store", "Produk"], ["/admin/more", "more", "Lainnya"]].map(([h, ic, lb]) => `<a href="#${h}" class="${path() === h || (h === "/admin/more" && (path() === "/admin/reports" || path().startsWith("/admin/settings"))) ? "on" : ""}">${svg(ic, 22)}${lb}${badgeFor(h) ? `<span class="badge">${badgeFor(h)}</span>` : ""}</a>`).join("");
  return `<aside class="a-side"><div class="logo"><img src="./tubi-icon.png" alt="">tubi <small>ADMIN</small></div>
    ${live("aside", ["route", "orders", "chats"], side)}<span class="gap"></span>
    <a href="#/">${svg("store", 20)}Lihat toko</a><button class="lnk" data-act="themetoggle">${svg("moon", 20)}Mode gelap/terang</button><button class="lnk" data-act="logout">${svg("logout", 20)}Keluar</button></aside>
  <header class="a-top"><div class="in"><button class="icon-btn only-d" data-act="sidebar" title="Sembunyikan / tampilkan sidebar (Ctrl+B)" aria-label="Sidebar">${svg("menu")}</button>
    ${live("atitle", ["route"], () => `<h2>${TITLES[path()] || "Admin"}</h2>`)}<span class="sp"></span>
    <button class="btn sm pal-btn" data-act="palette" title="Palet perintah (Ctrl+K)">${svg("search", 16)}<span class="only-d">Cari & perintah</span><kbd class="only-d">Ctrl K</kbd></button>
    ${live("achip", ["wa", "errors"], () => `<a class="chip" href="#/admin/settings" style="padding:7px 13px"><span class="dot ${waState()}"></span><span class="only-d">WhatsApp:&nbsp;</span>${WA_LABEL[waState()]}</a>`)}
    ${live("aav", ["profile", "auth"], () => `<span class="av" title="${esc(S.profile.displayName)} · ${isMain(S.user) ? "Admin utama" : "Admin"}">${S.profile.photoURL ? `<img src="${esc(S.profile.photoURL)}" alt="">` : initial(S.profile.displayName)}</span>`)}</div></header>
  ${live("aerr", ["errors"], errBanner)}
  <main id="view" class="a-main"></main>
  <nav class="a-nav">${live("anav", ["route", "orders", "chats"], nav)}</nav>`;
}
function errBanner() {
  const e = Object.entries(S.errors).filter(([, v]) => v === "permission-denied"); if (!e.length) return "";
  return `<div class="a-main" style="padding-bottom:0;padding-top:12px"><div class="alert"><b>Firestore menolak akses (${e.map(x => x[0]).join(", ")}).</b> Rules belum dipublish: buka Firebase Console → project <code>${firebaseConfig.projectId}</code> → Firestore → Rules → tempel isi <code>firestore.rules</code> → Publish. Lalu muat ulang halaman.</div></div>`;
}

// ===== Dashboard =====
const rowOrder = o => `<div class="r"><span class="av">${initial(o.customerName)}</span><div class="mid"><b>${esc(o.customerName || "Pelanggan")}</b><small class="muted">${(o.items || []).map(i => `${i.qty}× ${esc(i.name)}`).join(", ")} · ${ago(o.createdAt)}</small></div><div style="text-align:right"><b>${rupiah(o.total)}</b><br><span class="chip st-${statusOf(o.status)}">${STATUS_LABEL[statusOf(o.status)]}</span></div></div>`;
export function dashboard() {
  const kp = () => {
    const act = S.orders.filter(o => !["selesai", "dibatalkan"].includes(statusOf(o.status))).length, done = S.orders.filter(o => statusOf(o.status) === "selesai");
    return `<div class="kpis"><div class="kpi"><span class="l">${svg("store", 16)} Produk</span><b>${S.products.length}</b></div><div class="kpi"><span class="l">${svg("clock", 16)} Pesanan berjalan</span><b>${act}</b></div><div class="kpi"><span class="l">${svg("check", 16)} Pesanan selesai</span><b>${done.length}</b></div><div class="kpi"><span class="l">${svg("chart", 16)} Omzet selesai</span><b>${rupiah(done.reduce((a, o) => a + (+o.total || 0), 0))}</b></div></div>`;
  };
  return `${live("kpi", ["orders", "products"], kp)}
  <div class="two" style="margin-top:16px"><div class="card"><div class="row"><h3 style="margin:0">Pesanan terbaru</h3><span class="sp"></span><a class="btn sm" href="#/admin/orders">Lihat semua</a></div>
    ${live("recent", ["orders", "errors"], () => S.orders.length ? `<div class="tbl" style="margin-top:8px">${S.orders.slice(0, 6).map(rowOrder).join("")}</div>` : `<div class="empty" style="margin-top:10px">Belum ada pesanan masuk.</div>`)}</div>
  <div class="col">${live("quick", ["products"], () => `<div class="card"><h3>Aksi cepat</h3><div class="grid2"><a class="btn" href="#/admin/products">${svg("plus", 18)} Tambah produk</a><a class="btn" href="#/admin/orders">${svg("bag", 18)} Kelola pesanan</a><a class="btn" href="#/admin/chat">${svg("chat", 18)} Balas chat</a><a class="btn" href="#/admin/reports">${svg("chart", 18)} Laporan</a></div>${S.products.length ? "" : `<div class="alert" style="margin-top:12px">Katalog masih kosong — <a href="#/admin/products"><b>isi produk sekarang</b></a>.</div>`}<p class="muted xs only-d" style="margin-top:12px">Tips: tekan <kbd>Ctrl</kbd>+<kbd>K</kbd> untuk mencari perintah, <kbd>Ctrl</kbd>+<kbd>B</kbd> untuk menyembunyikan sidebar.</p><p class="muted xs only-m" style="margin-top:12px">Tips: ketuk ikon 🔍 di bar atas untuk mencari halaman, produk, atau pesanan.</p></div>`)}
    ${live("wamini", ["wa", "errors"], () => `<div class="card"><div class="row"><h3 style="margin:0">WhatsApp Bot</h3><span class="sp"></span><span class="chip"><span class="dot ${waState()}"></span>${WA_LABEL[waState()]}</span></div>${waBody(true)}<a class="btn full" style="margin-top:12px" href="#/admin/settings">Kelola WhatsApp</a></div>`)}</div></div>`;
}

// ===== Pesanan =====
let OF = "semua", OQ = "";
const nextOf = { menunggu: ["diproses", "Proses pesanan"], diproses: ["siap", "Tandai siap"], siap: ["selesai", "Selesaikan"] };
const payBadge = o => { const m = o.payment?.method; if (!m) return ""; const via = o.payment?.via ? ` · ${esc(o.payment.via)}` : ""; return m === "cod" ? `<span class="chip">COD</span>` : o.payment?.status === "paid" ? `<span class="chip st-selesai">Lunas${via}</span>` : `<span class="chip st-menunggu">Belum lunas${via}</span>`; };
const locChip = o => { const l = o.location; if (!l?.lat) return `<span class="chip">dari alamat tertulis</span>`; if (l.manual) return `<span class="chip st-selesai">Titik ditandai manual</span>`; return l.accuracy > 100 ? `<span class="chip st-menunggu" title="GPS kurang tepat">GPS ±${Math.round(l.accuracy)} m — cek peta</span>` : `<span class="chip st-selesai">GPS ±${Math.round(l.accuracy || 0)} m</span>`; };
const orderCard = o => {
  const st = statusOf(o.status), nx = nextOf[st], ph = normPhone(o.phone), gps = !!o.location?.lat, unpaid = o.payment && o.payment.status !== "paid" && st !== "dibatalkan";
  return `<div class="card order-card o-${st}"><div class="row wrap"><span class="av">${initial(o.customerName)}</span><div class="sp"><b>${esc(o.customerName || "Pelanggan")}</b> <span class="muted sm">#${esc(o.id.slice(0, 6).toUpperCase())} · ${timeText(o.createdAt)}</span><div class="muted sm">${esc(o.phone || "")} ${o.email ? "· " + esc(o.email) : ""}</div></div><div class="row wrap">${payBadge(o)}<span class="chip st-${st}">${STATUS_LABEL[st]}</span></div></div>
  <div class="items">${(o.items || []).map(i => `<div><span>${i.qty}× ${esc(i.name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join("")}<div style="border-top:1px dashed var(--line);padding-top:6px;margin-top:4px"><b>Total</b><b>${rupiah(o.total)}</b></div></div>
  <div class="addr"><div class="row" style="align-items:flex-start"><span class="addr-ic">${svg("pin", 18)}</span><div class="sp"><b>Alamat pengantaran</b> ${locChip(o)}<div>${esc(o.address || "-")}</div>${o.note ? `<div class="muted sm">Catatan: ${esc(o.note)}</div>` : ""}</div></div>
    <div class="row wrap" style="margin-top:10px"><a class="btn pri sm" target="_blank" rel="noopener" href="${esc(mapsDir(o))}">${svg("send", 15)} Navigasi</a><button class="btn sm" data-act="omap" data-id="${o.id}">${svg("pin", 15)} Lihat peta</button><button class="btn sm" data-act="copy" data-t="${esc(o.address || "")}">Salin alamat</button></div></div>
  ${o.payment?.method === "transfer" ? `<div class="row wrap">${o.paymentProof ? `<button class="btn sm" data-act="proofview" data-id="${o.id}">🧾 Lihat bukti bayar</button>` : `<span class="muted sm">Bukti bayar belum diunggah</span>`}</div>` : ""}
  <div class="row wrap">${nx ? `<button class="btn sm s-${nx[0]}" data-act="ostatus" data-id="${o.id}" data-s="${nx[0]}">${svg("check", 15)} ${nx[1]}</button>` : ""}${unpaid ? `<button class="btn sm" data-act="opaid" data-id="${o.id}">💰 Tandai lunas</button>` : ""}
  ${ph ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${ph}">${svg("wa", 15)} WhatsApp</a>` : ""}<button class="btn sm" data-act="print" data-id="${o.id}">${svg("print", 15)} Struk</button><button class="btn sm" data-act="oedit" data-id="${o.id}">${svg("edit", 15)} Edit</button>
  ${["menunggu", "diproses", "siap"].includes(st) ? `<button class="btn sm danger" data-act="ostatus" data-id="${o.id}" data-s="dibatalkan">Batalkan</button>` : ""}<button class="btn sm danger" data-act="odel" data-id="${o.id}">${svg("trash", 15)} Hapus</button></div></div>`;
};
const olistHtml = () => {
  const q = OQ.trim().toLowerCase(), l = S.orders.filter(o => (OF === "semua" || statusOf(o.status) === OF) && (!q || `${o.customerName} ${o.phone} ${o.address} ${o.id}`.toLowerCase().includes(q)));
  return l.length ? `<div class="col">${l.map(orderCard).join("")}</div>` : `<div class="empty">${S.orders.length ? "Tidak ada pesanan yang cocok." : "Belum ada pesanan masuk."}</div>`;
};
export function orders() {
  return `<div class="row wrap" style="margin-bottom:10px"><div class="search-in sp">${svg("search", 18)}<input type="search" placeholder="Cari nama, nomor, alamat, atau ID pesanan…" data-input="osearch" value="${esc(OQ)}"></div>
    ${live("oclear", ["orders"], () => { const n = S.orders.filter(o => ["selesai", "dibatalkan"].includes(statusOf(o.status))).length; return n ? `<button class="btn sm danger" data-act="oclean">${svg("trash", 15)} Bersihkan selesai/batal (${n})</button>` : ""; })}</div>
  <div class="tabs">${live("otabs", ["orders"], () => ["semua", ...STATUSES].map(f => `<button class="tab ${OF === f ? "on" : ""}" data-act="ofilter" data-f="${f}">${f === "semua" ? "Semua" : STATUS_LABEL[f]} (${f === "semua" ? S.orders.length : S.orders.filter(o => statusOf(o.status) === f).length})</button>`).join(""))}</div>
  ${live("olist", ["orders", "errors"], olistHtml)}`;
}
actions.osearch = t => { OQ = t.value; repaint("olist"); };
actions.ofilter = el => { OF = el.dataset.f; repaint("otabs"); repaint("olist"); };
actions.ostatus = async el => {
  const o = S.orders.find(x => x.id === el.dataset.id), s = el.dataset.s;
  if (s === "dibatalkan" && !await confirmBox("Batalkan pesanan ini?", `Pesanan ${o?.customerName || ""} akan ditandai dibatalkan dan pelanggan diberi tahu.`, "Ya, batalkan")) return;
  if (s === "diproses" && o?.payment?.method === "transfer" && o.payment.status !== "paid" && !await confirmBox("Pembayaran belum lunas", "Pesanan transfer/QRIS ini belum ditandai lunas. Cek bukti bayarnya dulu, atau tetap proses?", "Tetap proses", false)) return;
  const d = { status: s }; if (s === "selesai" && o?.payment?.method === "cod") d["payment.status"] = "paid";
  await F.updateDoc(F.doc(db, "orders", el.dataset.id), d); toast("Status diubah → " + STATUS_LABEL[s]);
};
actions.opaid = async el => { await F.updateDoc(F.doc(db, "orders", el.dataset.id), { "payment.status": "paid" }); toast("Ditandai lunas ✓"); };
actions.odel = async el => { const o = S.orders.find(x => x.id === el.dataset.id); if (await confirmBox("Hapus pesanan ini?", `Pesanan #${o.id.slice(0, 6).toUpperCase()} (${o.customerName || ""}) akan dihapus permanen dari laporan juga.`, "Hapus permanen")) { await F.deleteDoc(F.doc(db, "orders", o.id)); toast("Pesanan dihapus."); } };
actions.oclean = async () => {
  const l = S.orders.filter(o => ["selesai", "dibatalkan"].includes(statusOf(o.status)));
  if (!await confirmBox(`Hapus ${l.length} pesanan selesai/dibatalkan?`, "Pesanan selesai yang dihapus juga hilang dari laporan omzet. Pertimbangkan Ekspor CSV di halaman Laporan dulu.", "Hapus semua")) return;
  for (const o of l) await F.deleteDoc(F.doc(db, "orders", o.id)); toast(`${l.length} pesanan dihapus.`);
};
actions.oedit = el => {
  const o = S.orders.find(x => x.id === el.dataset.id);
  openOverlay(`<div class="sheet-head"><h3>Edit pesanan #${esc(o.id.slice(0, 6).toUpperCase())}</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <form class="col" data-form="oedit" data-id="${o.id}"><div class="grid2"><label>Nama<input name="name" required value="${esc(o.customerName || "")}"></label><label>No. WhatsApp<input name="phone" value="${esc(o.phone || "")}"></label></div>
  <label>Alamat<textarea name="address">${esc(o.address || "")}</textarea></label><label>Catatan<input name="note" value="${esc(o.note || "")}"></label><button class="btn pri" type="submit">Simpan perubahan</button></form>`);
};
forms.oedit = async (f, fd) => { await F.updateDoc(F.doc(db, "orders", f.dataset.id), { customerName: String(fd.get("name")).trim(), recipientName: String(fd.get("name")).trim(), phone: String(fd.get("phone")).trim(), address: String(fd.get("address")).trim(), note: String(fd.get("note")).trim() }); closeOverlay(); toast("Pesanan diperbarui."); };
actions.proofview = el => { const o = S.orders.find(x => x.id === el.dataset.id); openOverlay(`<div class="sheet-head"><h3>Bukti pembayaran</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div><img src="${esc(o.paymentProof)}" alt="Bukti" style="width:100%;border-radius:14px"><div class="row" style="margin-top:12px">${o.payment?.status !== "paid" ? `<button class="btn pri sp" data-act="opaid" data-id="${o.id}">💰 Tandai lunas</button>` : `<span class="chip st-selesai">Sudah lunas</span>`}</div>`, "wide"); };
actions.omap = el => {
  const o = S.orders.find(x => x.id === el.dataset.id), ph = normPhone(o.phone), gps = !!o.location?.lat;
  openOverlay(`<div class="sheet-head"><h3>Lokasi pengantaran</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  ${gps ? `<div id="vmap" class="locmap big"></div>` : `<div class="alert" style="margin-bottom:10px">Pelanggan tidak membagikan titik GPS. Navigasi dicari dari alamat tertulis — pastikan alamatnya jelas, atau hubungi pelanggan.</div>`}
  <div class="col" style="margin-top:12px"><div><b>${esc(o.customerName || "")}</b><div class="muted">${esc(o.address || "")}</div>${gps ? `<div class="muted xs">Koordinat ${o.location.lat}, ${o.location.lng}${o.location.accuracy ? ` · akurasi ±${Math.round(o.location.accuracy)} m` : ""}</div>` : ""}</div>
  <div class="row wrap"><a class="btn pri sp" target="_blank" rel="noopener" href="${esc(mapsDir(o))}">${svg("send", 18)} Mulai navigasi</a>${ph ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${ph}">${svg("wa", 18)} Hubungi</a>` : ""}</div></div>`, "wide");
  if (gps) viewer($("#vmap"), o.location).catch(e => { $("#vmap").innerHTML = `<div class="alert">${esc(e.message)}</div>`; });
};
actions.print = el => {
  const o = S.orders.find(x => x.id === el.dataset.id);
  openOverlay(`<div class="sheet-head"><h3>Struk pesanan</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <div class="receipt" id="rcp"><div class="rc-h">TUBI</div><div class="rc-s">#${esc(o.id.slice(0, 6).toUpperCase())} · ${timeText(o.createdAt)}</div><hr>
  <div>${esc(o.customerName || "")} · ${esc(o.phone || "")}</div><div>${esc(o.address || "")}</div><hr>
  ${(o.items || []).map(i => `<div class="rc-r"><span>${i.qty}× ${esc(i.name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join("")}<hr>
  ${+o.deliveryFee ? `<div class="rc-r"><span>Ongkir</span><span>${rupiah(o.deliveryFee)}</span></div>` : ""}${+o.discount ? `<div class="rc-r"><span>Diskon</span><span>- ${rupiah(o.discount)}</span></div>` : ""}
  <div class="rc-r rc-t"><span>TOTAL</span><span>${rupiah(o.total)}</span></div><div class="rc-s" style="margin-top:10px">Terima kasih sudah memesan ❤</div></div>
  <div class="col" style="margin-top:14px"><button class="btn pri" data-act="btprint" data-id="${o.id}">${svg("bt", 18)} Cetak via printer Bluetooth</button><button class="btn" data-act="doprint">${svg("print", 18)} Cetak lewat browser / PDF</button>
  <small class="muted">Printer Bluetooth dihubungkan sekali di Pengaturan → Printer Bluetooth. ${BT.connected() ? `Terhubung: <b>${esc(BT.printerName())}</b>.` : "Belum terhubung — tombol di atas akan meminta pairing."}</small></div>`);
};
actions.doprint = () => { let p = $("#print"); if (!p) { p = document.createElement("div"); p.id = "print"; document.body.appendChild(p); } p.innerHTML = $("#rcp").outerHTML; window.print(); };
actions.btprint = async el => {
  const o = S.orders.find(x => x.id === el.dataset.id);
  try { if (!BT.connected()) { const n = await BT.connect(); toast("Terhubung ke " + n); } await BT.printOrder(o, "TUBI"); toast("Struk dikirim ke printer ✓"); }
  catch (e) { if (e.name === "NotFoundError") return; throw new Error(e.message || "Gagal mencetak via Bluetooth."); }
};

// ===== Produk =====
const SEED = [
  { id: "default-roti", name: "Roti Kukus Thailand", price: 5000, rating: 4.9, category: "Roti", attributes: ["Manis", "Coklat", "Keju"], image: "./assets/roti-kukus.png", description: "Roti kukus lembut dengan pilihan rasa coklat, matcha, keju, blueberry, strawberry, dan abon." },
  { id: "default-topokki", name: "Topokki Sosis & Odeng", price: 10000, rating: 4.9, category: "Topokki", attributes: ["Pedas", "Gurih"], image: "./assets/topokki.png", description: "Topokki kenyal dengan saus pedas gurih, sosis, dan odeng." },
  { id: "default-cilok", name: "Cilok dan Tahu", price: 10000, rating: 4.8, category: "Cilok", attributes: ["Gurih"], image: "./assets/cilok.png", description: "Cilok dan tahu porsi praktis dengan pilihan saus gurih." },
  { id: "default-kwetiau", name: "Kwetiau Goreng Pangsit", price: 12000, rating: 4.8, category: "Kwetiau", attributes: ["Gurih"], image: "./assets/kwetiau.png", description: "Kwetiau goreng gurih dengan pangsit dan topping pilihan." },
  { id: "default-chili", name: "Chili Oil Favorit", price: 15000, rating: 4.9, category: "Dimsum", attributes: ["Sambal", "Pedas"], image: "./assets/dimsum-chili.png", description: "Camilan dengan chili oil khas untuk pencinta pedas gurih." },
  { id: "default-mambo", name: "Es Mambo Susu", price: 2000, rating: 4.9, category: "Minuman", attributes: ["Segar", "Manis"], image: "./assets/es-mambo.png", description: "Es mambo susu aneka rasa, segar kapan saja." },
  { id: "default-creamy", name: "Creamy Special Tubi", price: 13000, rating: 4.8, category: "Lainnya", attributes: ["Creamy", "Gurih"], image: "./assets/menu-poster.jpg", description: "Pilihan creamy dengan saus lembut dan gurih." }
];
const CAT_HINT = ["Roti", "Dimsum", "Topokki", "Kwetiau", "Cilok", "Minuman", "Kue", "Camilan", "Nasi", "Mie & bakso", "Aneka makanan", "Lainnya"];
const catList = () => [...new Set([...S.products.map(p => String(p.category || "").trim()).filter(Boolean), ...CAT_HINT])];
export function products() {
  return `<div class="row wrap" style="margin-bottom:14px"><button class="btn pri" data-act="pform">${svg("plus", 18)} Tambah produk</button><button class="btn" data-act="fitall" title="Tampilkan seluruh foto tanpa dipotong di semua produk">Foto semua tampil utuh</button>${live("seedbtn", ["products"], () => S.products.length ? "" : `<button class="btn" data-act="seed">Buat katalog awal (7 menu)</button>`)}</div>
  ${live("plist", ["products", "reviews", "errors"], () => S.products.length ? `<div class="col">${S.products.map(p => `<div class="card row wrap" style="padding:12px"><div class="thumb" style="width:72px;height:72px">${pic(p)}</div><div class="sp" style="min-width:160px"><b>${esc(p.name)}</b> ${avail(p) ? "" : `<span class="chip st-dibatalkan">Habis</span>`}<div class="muted sm">${rupiah(p.price)} · ${esc(p.category || "")} · ${stars(ratingOf(p))} ${ratingOf(p).toFixed(1)}</div></div>
    <button class="btn sm" data-act="stock" data-id="${p.id}">${avail(p) ? "Set habis" : "Set tersedia"}</button><button class="btn sm" data-act="pform" data-id="${p.id}">${svg("edit", 15)} Edit</button><button class="btn sm danger" data-act="pdel" data-id="${p.id}" aria-label="Hapus">${svg("trash", 15)}</button></div>`).join("")}</div>` : `<div class="empty">Belum ada produk. Tambahkan produk pertama atau buat katalog awal.</div>`)}`;
}
actions.seed = async () => { if (!await confirmBox("Buat katalog awal?", "7 menu contoh Tubi akan ditambahkan. Kamu bisa mengubah atau menghapusnya kapan saja.", "Buat katalog", false)) return; for (const { id, ...d } of SEED) await F.setDoc(F.doc(db, "products", id), { ...d, tags: d.attributes.map(x => x.toLowerCase()), available: true, availability: "tersedia" }); toast("Katalog awal dibuat."); };
actions.stock = async el => { const p = S.products.find(x => x.id === el.dataset.id), ok = !avail(p); await F.updateDoc(F.doc(db, "products", p.id), { available: ok, availability: ok ? "tersedia" : "habis" }); };
actions.pdel = async el => { const p = S.products.find(x => x.id === el.dataset.id); if (await confirmBox("Hapus produk ini?", `“${p?.name}” akan dihapus dari menu pelanggan.`, "Hapus")) await F.deleteDoc(F.doc(db, "products", el.dataset.id)); };
actions.pform = el => {
  const p = S.products.find(x => x.id === el.dataset?.id) || {};
  openOverlay(`<div class="sheet-head"><h3>${p.id ? "Edit produk" : "Produk baru"}</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <form class="col" data-form="product" data-id="${p.id || ""}"><label>Nama<input name="name" required value="${esc(p.name || "")}" placeholder="Contoh: Nasi goreng spesial"></label>
  <div class="grid2"><label>Harga (Rp)<input name="price" type="number" min="0" required value="${p.price ?? ""}"></label><label>Kategori <span class="hint">bebas — ketik atau pilih</span><input name="category" list="catlist" required value="${esc(p.category || "")}" placeholder="Aneka makanan"><datalist id="catlist">${catList().map(c => `<option value="${esc(c)}">`).join("")}</datalist></label></div>
  <label>Atribut / rasa <span class="hint">pisahkan koma</span><input name="attributes" value="${esc((p.attributes || []).join(", "))}" placeholder="pedas, gurih"></label>
  <label>Deskripsi<textarea name="description">${esc(p.description || "")}</textarea></label>
  <div class="grid2"><label>Stok<select name="availability"><option value="tersedia">Tersedia</option><option value="habis" ${p.id && !avail(p) ? "selected" : ""}>Habis</option></select></label></div>
  <div><div class="lbl">Foto produk</div>${dropzone("image", img(p), p.id && img(p) ? "Ganti foto" : "Pilih foto atau seret ke sini")}</div>
  <div class="fitbox"><div class="row wrap"><div class="lbl sp" style="margin:0">Tampilan foto di menu</div><div class="seg" id="fitseg"><button type="button" data-act="fitmode" data-m="cover" class="${p.imageFit === "contain" ? "" : "on"}">Isi bingkai</button><button type="button" data-act="fitmode" data-m="contain" class="${p.imageFit === "contain" ? "on" : ""}">Tampil utuh</button></div></div>
    <div class="fit-prev ${p.imageFit === "contain" ? "is-contain" : ""}" id="fitprev"><img id="fitimg" ${img(p) ? `src="${esc(img(p))}"` : "hidden"} alt="" ${imgStyle(p)}><span class="fp" style="left:${p.imageX ?? 50}%;top:${p.imageY ?? 50}%"></span><span class="fit-hint">Pratinjau persis seperti di kartu menu</span></div>
    <input type="hidden" name="fit" value="${p.imageFit === "contain" ? "contain" : "cover"}"><input type="hidden" name="fx" value="${p.imageX ?? 50}"><input type="hidden" name="fy" value="${p.imageY ?? 50}">
    <small class="muted"><b>Isi bingkai</b>: ketuk/geser pada pratinjau untuk memilih bagian foto yang ditampilkan. <b>Tampil utuh</b>: seluruh foto terlihat, tidak dipotong.</small></div>
  <button class="btn pri" type="submit">${p.id ? "Simpan perubahan" : "Tambah produk"}</button></form>`, "wide");
};
forms.product = async (f, fd) => {
  const id = f.dataset.id, old = S.products.find(x => x.id === id) || {}, attrs = String(fd.get("attributes") || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 15), av = fd.get("availability");
  const d = { name: String(fd.get("name")).trim(), price: Math.max(0, +fd.get("price") || 0), category: String(fd.get("category") || "Lainnya").trim() || "Lainnya", attributes: attrs, tags: attrs.map(x => x.toLowerCase()), description: String(fd.get("description") || "").trim(), available: av !== "habis", availability: av, imageFit: fd.get("fit") === "contain" ? "contain" : "cover", imageX: Math.min(100, Math.max(0, +fd.get("fx") || 50)), imageY: Math.min(100, Math.max(0, +fd.get("fy") || 50)) };
  const file = fd.get("image"); if (file && file.size) d.image = await compressImage(file); else if (old.image) d.image = old.image;
  if (id) await F.setDoc(F.doc(db, "products", id), d, { merge: true }); else await F.addDoc(F.collection(db, "products"), { ...d, rating: 5, createdAt: F.serverTimestamp() });
  closeOverlay(); toast("Produk disimpan.");
};

// ===== Chat =====
export function chat() {
  const list = () => S.chats.length ? `<div class="threads">${S.chats.map(c => `<button class="thread ${S.openChat === c.id ? "on" : ""}" data-act="thread" data-id="${c.id}"><span class="av">${c.photoURL ? `<img src="${esc(c.photoURL)}" alt="">` : initial(c.name)}</span><div class="mid"><b>${esc(c.name || "Pelanggan")}</b><small class="muted">${c.lastFrom === "admin" ? "Anda: " : ""}${esc(c.lastMessage || "")}</small></div>${+c.unreadAdmin ? `<span class="badge" style="position:static">${c.unreadAdmin}</span>` : ""}</button>`).join("")}</div>` : `<div class="empty">Belum ada chat dari pelanggan.</div>`;
  return `<div class="chat-split ${S.openChat ? "open" : ""}" id="csplit"><div class="threads-box card" style="padding:8px;align-self:start;max-height:calc(100vh - 150px);overflow:auto">${live("threads", ["chats", "errors"], () => S.errors.chats ? `<div class="alert">Chat ditolak Firestore. Publish rules.</div>` : list())}</div>
  <div class="chat-box chat adm">${live("cpane", ["openchat", "msgs", "chats"], pane, () => { toEnd(); const c = S.chats.find(x => x.id === S.openChat); if (c && +c.unreadAdmin > 0) markRead(c.id, "admin"); })}</div></div>`;
}
function pane() {
  const c = S.chats.find(x => x.id === S.openChat);
  if (!S.openChat) return `<div class="empty" style="margin:auto;border:0">Pilih percakapan di sebelah kiri.</div>`;
  return `<div class="chat-head"><button class="icon-btn only-m" data-act="chatback">${svg("back")}</button><span class="av">${initial(c?.name)}</span><div><b>${esc(c?.name || "Pelanggan")}</b><div class="muted xs">${esc(c?.email || "")}${c?.phone ? " · " + esc(c.phone) : ""}</div></div></div><div class="msgs">${msgsHtml("admin")}</div>${chatForm()}`;
}
actions.thread = el => { openThread(el.dataset.id); markRead(el.dataset.id, "admin"); $("#csplit")?.classList.add("open"); emit("openchat"); repaint("threads"); };
actions.chatback = () => { openThread(null); $("#csplit")?.classList.remove("open"); emit("openchat"); repaint("threads"); };

// ===== Laporan =====
let RP = 7;
const dayStart = (d = new Date(), off = 0) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + off); return x.getTime() / 1000; };
const net = o => (o.subtotal != null ? (+o.subtotal || 0) - (+o.discount || 0) : (+o.total || 0));
export function reports() {
  return live("rep", ["orders"], reportHtml);
}
function reportHtml() {
  const done = S.orders.filter(o => statusOf(o.status) === "selesai"), t0 = dayStart(), y0 = dayStart(new Date(), -1), m0 = (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d / 1000; })();
  const sum = (a, b = Infinity, f = o => +o.total || 0) => done.filter(o => secs(o.createdAt) >= a && secs(o.createdAt) < b).reduce((s, o) => s + f(o), 0);
  const cnt = (a, b = Infinity) => done.filter(o => secs(o.createdAt) >= a && secs(o.createdAt) < b).length;
  const tot = done.reduce((s, o) => s + (+o.total || 0), 0), netTot = done.reduce((s, o) => s + net(o), 0);
  const days = [...Array(RP)].map((_, i) => { const s = dayStart(new Date(), -(RP - 1 - i)), e = s + 86400; return { d: new Date(s * 1000), v: sum(s, e), n: cnt(s, e) }; });
  const mx = Math.max(1, ...days.map(d => d.v)), top = {}, pay = { cod: 0, transfer: 0 };
  done.forEach(o => { (o.items || []).forEach(i => top[i.name] = (top[i.name] || 0) + i.qty); pay[o.payment?.method === "transfer" ? "transfer" : "cod"] += +o.total || 0; });
  const tl = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6), fmt = d => d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
  return `<div class="row wrap" style="margin-bottom:12px"><span class="muted sm sp">Hanya pesanan berstatus <b>Selesai</b> yang dihitung sebagai pendapatan.</span><button class="btn sm" data-act="csv">${svg("download", 15)} Ekspor CSV</button></div>
  <div class="kpis"><div class="kpi hl"><span class="l">Hari ini</span><b>${rupiah(sum(t0))}</b><small class="muted">${cnt(t0)} pesanan</small></div><div class="kpi"><span class="l">Kemarin</span><b>${rupiah(sum(y0, t0))}</b><small class="muted">${cnt(y0, t0)} pesanan</small></div><div class="kpi"><span class="l">7 hari terakhir</span><b>${rupiah(sum(dayStart(new Date(), -6)))}</b><small class="muted">${cnt(dayStart(new Date(), -6))} pesanan</small></div><div class="kpi"><span class="l">Bulan ini</span><b>${rupiah(sum(m0))}</b><small class="muted">${cnt(m0)} pesanan</small></div></div>
  <div class="kpis" style="margin-top:12px"><div class="kpi"><span class="l">Total omzet</span><b>${rupiah(tot)}</b><small class="muted">termasuk ongkir & pajak</small></div><div class="kpi"><span class="l">Pendapatan bersih produk</span><b>${rupiah(netTot)}</b><small class="muted">harga produk − diskon</small></div><div class="kpi"><span class="l">Pesanan selesai</span><b>${done.length}</b></div><div class="kpi"><span class="l">Rata-rata / pesanan</span><b>${rupiah(done.length ? tot / done.length : 0)}</b></div></div>
  <div class="two" style="margin-top:16px"><div class="card"><div class="row wrap"><h3 style="margin:0" class="sp">Omzet harian</h3><div class="seg"><button class="${RP === 7 ? "on" : ""}" data-act="rperiod" data-n="7">7 hari</button><button class="${RP === 14 ? "on" : ""}" data-act="rperiod" data-n="14">14 hari</button><button class="${RP === 30 ? "on" : ""}" data-act="rperiod" data-n="30">30 hari</button></div></div>
    <div class="bars ${RP > 14 ? "dense" : ""}">${days.map(d => `<div title="${fmt(d.d)} — ${rupiah(d.v)} (${d.n} pesanan)"><b class="bw"><i style="height:${Math.max(3, d.v / mx * 100)}%"></i></b><span>${RP > 14 ? d.d.getDate() : d.d.toLocaleDateString("id-ID", { weekday: "short" })}</span></div>`).join("")}</div>
    <div class="tbl" style="margin-top:10px;max-height:240px;overflow:auto">${[...days].reverse().map(d => `<div class="r"><div class="mid"><b>${fmt(d.d)}</b></div><span class="muted sm">${d.n} pesanan</span><b>${rupiah(d.v)}</b></div>`).join("")}</div></div>
  <div class="col"><div class="card"><h3>Menu terlaris</h3>${tl.length ? `<div class="tbl">${tl.map(([n, q], i) => `<div class="r"><b>${i + 1}</b><div class="mid"><b>${esc(n)}</b></div><span class="chip">${q} terjual</span></div>`).join("")}</div>` : `<div class="empty">Belum ada pesanan selesai.</div>`}</div>
  <div class="card"><h3>Metode pembayaran</h3><div class="tbl"><div class="r"><div class="mid"><b>Bayar di tempat (COD)</b></div><b>${rupiah(pay.cod)}</b></div><div class="r"><div class="mid"><b>Transfer / QRIS</b></div><b>${rupiah(pay.transfer)}</b></div></div></div>
  <div class="card"><h3>Status pesanan</h3><div class="row wrap">${STATUSES.map(s => `<span class="chip st-${s}">${STATUS_LABEL[s]}: ${S.orders.filter(o => statusOf(o.status) === s).length}</span>`).join("")}</div></div></div></div>`;
}
actions.rperiod = el => { RP = +el.dataset.n; repaint("rep"); };
actions.csv = () => {
  const done = S.orders.filter(o => statusOf(o.status) === "selesai").sort((a, b) => secs(a.createdAt) - secs(b.createdAt));
  if (!done.length) throw new Error("Belum ada pesanan selesai untuk diekspor.");
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["Tanggal", "ID", "Pelanggan", "Telepon", "Item", "Subtotal", "Diskon", "Ongkir", "Pajak", "Total", "Metode bayar"].map(q).join(",")].concat(done.map(o => [new Date(secs(o.createdAt) * 1000).toLocaleString("id-ID"), o.id.slice(0, 6).toUpperCase(), o.customerName, o.phone, (o.items || []).map(i => `${i.qty}x ${i.name}`).join("; "), o.subtotal ?? "", o.discount ?? 0, o.deliveryFee ?? 0, o.tax ?? 0, o.total, o.payment?.method === "transfer" ? "Transfer" : "COD"].map(q).join(",")));
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = `laporan-tubi-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("CSV diunduh ✓");
};

// ===== Pengaturan =====
export function waBody(mini) {
  const w = S.wa, st = waState();
  if (S.errors.wa === "permission-denied") return `<div class="alert" style="margin-top:10px"><b>Dashboard ditolak membaca status gateway.</b> Publish <code>firestore.rules</code> terbaru, lalu muat ulang.</div>`;
  let h = "";
  if (st === "qr" && w.qr) h = `<div class="qr"><img src="${w.qr}" alt="QR WhatsApp"><small class="muted">WhatsApp → Perangkat tertaut → Tautkan perangkat → scan</small></div>`;
  else if (st === "pairing" && w.pairingCode) h = `<div class="pair">${esc(w.pairingCode)}</div><small class="muted">WhatsApp → Perangkat tertaut → Tautkan dengan nomor telepon</small>`;
  else if (st === "connected") h = `<p class="muted" style="margin-top:8px">Terhubung${w.me ? ` sebagai <b>+${esc(w.me)}</b>` : ""}. Notifikasi pesanan &amp; chat aktif.${!mini && w.lastTest ? ` Tes terakhir: <b>${w.lastTest === "ok" ? "berhasil ✓" : "gagal ✗"}</b>.` : ""}</p>`;
  else h = mini ? `<p class="muted" style="margin-top:8px">Bot belum menyala (opsional). Panduan ada di Pengaturan → WhatsApp Bot.</p>` : `<div class="alert" style="margin-top:10px">${w ? "Gateway tidak mengirim sinyal lagi — program <code>npm start</code> kemungkinan sudah berhenti." : "Belum ada sinyal dari gateway."} Jalankan <code>npm start</code> di folder <code>tubi-wa-gateway</code>; QR akan muncul di sini otomatis.</div>`;
  return h + (w?.error ? `<div class="alert" style="margin-top:8px">${esc(w.error)}</div>` : "");
}
const waGuide = () => `<details class="guide" ${waState() === "connected" ? "" : "open"}><summary>${svg("shield", 18)} Apa itu bot WhatsApp & cara menyalakannya</summary>
  <p><b>Bot</b> = satu nomor WhatsApp (boleh nomor toko) yang dihubungkan ke program kecil bernama <b>gateway</b> di komputer/server Anda. Setelah terhubung, <b>setiap pesanan & chat baru otomatis dikirim ke WhatsApp admin</b>, dan <b>pelanggan dikabari saat status pesanan berubah</b>. Tubi tetap berjalan 100% tanpa bot.</p>
  <ol class="guide-steps"><li><span>1</span><div>Buka folder <code>tubi-wa-gateway</code> di komputer (<b>jangan dihapus</b>).</div></li><li><span>2</span><div>Di terminal folder itu jalankan <code>npm install</code> (sekali saja), lalu <code>npm start</code>.</div></li><li><span>3</span><div>Biarkan terminal terbuka. Dalam ±10 detik <b>QR muncul di kartu ini</b>.</div></li><li><span>4</span><div>HP: WhatsApp → ⋮ → <b>Perangkat tertaut</b> → <b>Tautkan perangkat</b> → scan QR.</div></li><li><span>5</span><div>Status menjadi <b>Terhubung</b>. Selesai ✓</div></li></ol>
  <p class="muted sm">Komputer harus menyala selama bot dipakai. Agar aktif 24 jam, pasang gateway di VPS/Railway/Fly.</p></details>`;
const phoneShow = p => p ? "+" + esc(p) : "belum diisi";
const recipients = () => { const l = []; if (S.settings.whatsapp) l.push(`<b>${phoneShow(S.settings.whatsapp)}</b> (admin utama)`); S.admins.filter(a => a.phone).forEach(a => l.push(`<b>${phoneShow(a.phone)}</b> (${esc(a.name || a.id)})`)); return l.length ? l.join(", ") : "belum ada nomor"; };

const GROUPS = [
  ["toko", "store", "Toko & biaya", "Buka/tutup toko, kontak, ongkir, voucher"],
  ["tampilan", "grid", "Tampilan beranda", "Judul, teks, label, dan gambar banner"],
  ["bayar", "tag", "Pembayaran", "COD, rekening, e-wallet, dan QRIS"],
  ["admin", "shield", "Admin", "Admin tambahan & nomor penerima notifikasi"],
  ["wa", "wa", "WhatsApp Bot", "QR, status, dan notifikasi otomatis"],
  ["printer", "print", "Printer Bluetooth", "Hubungkan printer untuk cetak struk"],
  ["sistem", "check", "Sistem & laporan", "Cek sistem dan laporan masalah pelanggan"]
];
export const GROUP_TITLES = Object.fromEntries(GROUPS.map(g => [g[0], g[2]]));
const groupStatus = k => k === "wa" ? `<span class="dot ${waState()}"></span>${WA_LABEL[waState()]}` : k === "printer" ? (BT.connected() ? `<span class="dot connected"></span>Terhubung` : `<span class="dot"></span>Belum`) : k === "sistem" ? (S.bugs.filter(b => b.status !== "selesai").length ? `<span class="badge-in">${S.bugs.filter(b => b.status !== "selesai").length} baru</span>` : "") : k === "admin" ? `${S.admins.length + 1} akun` : k === "bayar" ? `${payMethods().length + (S.settings.payQris ? 1 : 0) + (S.settings.payCod === false ? 0 : 1)} metode` : "";
export const groupList = () => GROUPS.map(([k, ic, t, d]) => `<a class="menu-item" href="#/admin/settings/${k}"><span class="mi-ic">${svg(ic, 20)}</span><span class="mi-tx"><b>${t}</b><small class="muted">${d}</small></span><span class="mi-st">${groupStatus(k)}</span><span class="mi-ch">›</span></a>`).join("");

const payCard = () => {
  const s = S.settings, ms = payMethods();
  return `<div class="col"><form class="card col" data-form="paybase"><h3>Metode di checkout</h3><label class="chk"><input type="checkbox" name="cod" ${s.payCod === false ? "" : "checked"}> Bayar di tempat (COD)</label><button class="btn pri" type="submit">Simpan</button></form>
  <div class="card"><div class="row"><h3 style="margin:0" class="sp">Rekening & e-wallet</h3><button class="btn pri sm" data-act="pmform">${svg("plus", 16)} Tambah</button></div>
    <p class="muted sm" style="margin:8px 0 4px">Contoh: BCA, DANA, GoPay. Isi <b>tautan pembayaran</b> bila ada (mis. link DANA / payment link) supaya pelanggan bisa langsung membukanya setelah memesan.</p>
    ${ms.length ? `<div class="tbl">${ms.map(m => `<div class="r"><div class="mid"><b>${esc(m.name)}</b><small class="muted">${esc((m.detail || "").split("\n")[0])}${m.link ? " · 🔗 ada tautan" : ""}</small></div><button class="btn sm" data-act="pmform" data-id="${esc(m.id)}">Edit</button><button class="btn sm danger" data-act="pmdel" data-id="${esc(m.id)}" aria-label="Hapus">${svg("trash", 14)}</button></div>`).join("")}</div>` : `<div class="empty" style="margin-top:10px">Belum ada. Tambahkan rekening atau e-wallet.</div>`}</div>
  <form class="card col" data-form="qris"><h3>QRIS</h3>${dropzone("qris", s.payQris || "", "Unggah gambar QRIS")}<label class="chk"><input type="checkbox" name="qrisdel"> Hapus QRIS</label><button class="btn pri" type="submit">Simpan QRIS</button></form></div>`;
};

export function settings() {
  const g = path().split("/")[3] || "", cur = GROUP_TITLES[g] ? g : "toko";
  const s = S.settings, main = isMain(S.user);
  const storeForm = () => `<form class="card col" data-form="store"><h3>Toko & biaya</h3>
    <label class="chk"><input type="checkbox" name="open" ${s.open === false ? "" : "checked"}> Toko buka (pelanggan bisa memesan)</label>
    <div class="grid2"><label>Nomor WhatsApp admin utama<input name="number" required value="${esc(s.whatsapp || "")}" placeholder="08xxxxxxxxxx"></label><label>Nama kontak<input name="name" value="${esc(s.whatsappName || "Admin Tubi")}"></label></div>
    <label>Jam operasional<input name="hours" value="${esc(s.hours || "")}" placeholder="09.00–21.00"></label>
    <div class="grid2"><label>Ongkir (Rp)<input name="fee" type="number" min="0" value="${+s.deliveryFee || 0}"></label><label>Gratis ongkir min. belanja<input name="freeMin" type="number" min="0" value="${+s.freeShippingMin || 0}"></label></div>
    <div class="grid3"><label>Pajak (%)<input name="tax" type="number" min="0" max="100" value="${+s.taxPct || 0}"></label><label>Kode voucher<input name="vcode" value="${esc(s.voucherCode || "")}" placeholder="HEMAT10"></label><label>Diskon (%)<input name="vpct" type="number" min="0" max="100" value="${+s.voucherPct || 0}"></label></div>
    <label>Maks. diskon (Rp)<input name="vmax" type="number" min="0" value="${+s.voucherMax || 0}"></label><button class="btn pri" type="submit">Simpan pengaturan</button></form>`;
  const lookForm = () => `<form class="card col" data-form="look"><h3>Tampilan beranda toko</h3><p class="muted sm" style="margin:-6px 0 0">Teks dan gambar banner yang dilihat pelanggan di halaman depan.</p>
    <label>Judul besar <span class="hint">Enter = baris baru</span><textarea name="title" rows="2">${esc(s.heroTitle ?? "Lapar?\nPesan Tubi.")}</textarea></label>
    <label>Deskripsi<textarea name="text" rows="2">${esc(s.heroText ?? "Roti kukus, topokki, cilok, dan jajanan favorit — langsung dari HP, status pesanan terlihat real-time.")}</textarea></label>
    <label>Label singkat <span class="hint">pisahkan dengan koma · kosongkan untuk menyembunyikan</span><input name="tags" value="${esc(s.heroTags ?? "Fresh setiap hari, Antar cepat, Harga pelajar")}"></label>
    <div><div class="lbl">Gambar banner</div>${dropzone("hero", s.heroImage || "", "Ganti gambar banner")}<label class="chk" style="margin-top:8px"><input type="checkbox" name="herodel"> Kembalikan ke gambar bawaan</label></div><button class="btn pri" type="submit">Simpan tampilan</button></form>`;
  const adm = () => `<div class="card"><h3>Admin & penerima notifikasi</h3><div class="tbl">
    <div class="r"><span class="av">H</span><div class="mid"><b>hilmykia@gmail.com</b><small class="muted">Admin utama · WA ${phoneShow(s.whatsapp)}</small></div><span class="chip st-selesai">Utama</span></div>
    ${S.admins.filter(a => !FIXED_ADMINS.includes(a.id)).map(a => `<div class="r"><span class="av">${initial(a.name || a.id)}</span><div class="mid"><b>${esc(a.name || a.id)}</b><small class="muted">${esc(a.id)} · WA ${phoneShow(a.phone)}</small></div>${main ? `<button class="btn sm" data-act="admphone" data-id="${esc(a.id)}">Nomor WA</button><button class="btn sm danger" data-act="admdel" data-id="${esc(a.id)}">Hapus</button>` : ""}</div>`).join("")}</div>
    ${main ? `<form class="col" data-form="admin" style="margin-top:12px"><div class="grid2"><input name="email" type="email" required placeholder="email@gmail.com"><input name="name" placeholder="Nama admin"></div><input name="phone" inputmode="tel" placeholder="Nomor WhatsApp admin (menerima notifikasi bot)"><button class="btn pri" type="submit">Tambah admin</button></form>` : `<p class="muted sm" style="margin-top:12px">Hanya admin utama yang dapat menambah atau menghapus admin.</p>`}</div>`;
  const wa = () => `<div class="card"><h3>WhatsApp Bot (Baileys)</h3>${waGuide()}<div class="row" style="margin-top:12px"><span class="dot ${waState()}"></span><b>Status: ${WA_LABEL[waState()]}</b></div>${waBody()}
    <div class="row wrap" style="margin-top:12px"><button class="btn sm" data-act="wacmd" data-a="test">Kirim pesan tes</button><button class="btn sm" data-act="wacmd" data-a="restart">Restart</button><button class="btn sm danger" data-act="wacmd" data-a="logout">Putuskan WhatsApp</button></div>
    <details style="margin-top:10px"><summary class="b" style="cursor:pointer">Alternatif: kode pairing (tanpa QR)</summary><form class="row" style="margin-top:8px" data-form="wapair"><input name="phone" placeholder="Nomor akun WA bot, mis. 62812…" inputmode="tel"><button class="btn" type="submit">Minta kode</button></form></details>
    <label class="chk" style="margin-top:12px"><input type="checkbox" data-change="wanotify" data-k="waNotifyAdmin" ${s.waNotifyAdmin !== false ? "checked" : ""}> Kirim pesanan &amp; chat baru ke WhatsApp admin</label>
    <label class="chk" style="margin-top:8px"><input type="checkbox" data-change="wanotify" data-k="waNotifyCustomer" ${s.waNotifyCustomer !== false ? "checked" : ""}> Kabari pelanggan saat pesanan diterima &amp; berubah status</label>
    <p class="muted sm" style="margin-top:10px">Penerima notifikasi: ${recipients()}.</p></div>`;
  const printer = () => `<div class="card"><h3>Printer Bluetooth</h3>
    <div class="row"><span class="dot ${BT.connected() ? "connected" : ""}"></span><b>${BT.connected() ? "Terhubung: " + esc(BT.printerName()) : "Belum terhubung"}</b></div>
    ${BT.supported() ? "" : `<div class="alert" style="margin-top:10px">Browser ini tidak mendukung Web Bluetooth. Gunakan <b>Chrome / Edge</b> di Android atau komputer (lewat HTTPS). iPhone/iPad dan Firefox belum didukung — gunakan “Cetak lewat browser”.</div>`}
    <div class="row wrap" style="margin-top:12px"><span class="muted sm">Lebar kertas</span><div class="seg"><button class="${BT.width() === 32 ? "on" : ""}" data-act="btpaper" data-mm="58">58 mm</button><button class="${BT.width() === 48 ? "on" : ""}" data-act="btpaper" data-mm="80">80 mm</button></div></div>
    <div class="row wrap" style="margin-top:12px"><button class="btn pri sm" data-act="btconnect">${svg("bt", 16)} Hubungkan printer</button><button class="btn sm" data-act="bttest">Tes cetak</button><button class="btn sm danger" data-act="btdisc">Putuskan</button></div>
    <details class="guide" style="margin-top:12px"><summary>${svg("shield", 18)} Cara menyambungkan printer</summary><ol class="guide-steps"><li><span>1</span><div>Nyalakan printer thermal dan aktifkan Bluetooth di HP/laptop.</div></li><li><span>2</span><div>Tekan <b>Hubungkan printer</b>, pilih nama printer dari daftar, lalu izinkan.</div></li><li><span>3</span><div>Tekan <b>Tes cetak</b>. Setelah itu tombol <b>Cetak via printer Bluetooth</b> di setiap struk siap dipakai.</div></li></ol>
    <p class="muted sm">Mendukung printer thermal <b>BLE</b> berperintah ESC/POS (umumnya 58 mm). Printer Bluetooth <i>klasik</i> (SPP) tidak bisa disambung langsung oleh browser — pakai aplikasi pencetak Android (mis. RawBT) lalu “Cetak lewat browser”. Koneksi harus diulang bila halaman dimuat ulang.</p></details></div>`;
  const bugs = () => `<div class="card"><h3>Laporan masalah dari pelanggan (${S.bugs.filter(b => b.status !== "selesai").length} baru)</h3>${S.bugs.length ? `<div class="tbl">${S.bugs.slice(0, 15).map(b => `<div class="r"><div class="mid" style="white-space:normal"><b>${esc(b.type)} · ${esc(b.email || "")}</b><small class="muted" style="white-space:normal">${esc(b.description)}</small></div>${b.screenshot ? `<button class="btn sm" data-act="bugshot" data-id="${b.id}">🖼</button>` : ""}${b.status === "selesai" ? `<span class="chip st-selesai">Selesai</span>` : `<button class="btn sm" data-act="bugdone" data-id="${b.id}">Selesai</button>`}<button class="btn sm danger" data-act="bugdel" data-id="${b.id}" aria-label="Hapus">${svg("trash", 14)}</button></div>`).join("")}</div>` : `<div class="empty">Belum ada laporan.</div>`}</div>`;
  const diag = () => `<div class="card"><h3>Cek sistem</h3><p class="muted sm" style="margin-bottom:10px">Menguji koneksi ke Firestore, rules, akun, dan gateway WhatsApp.</p><button class="btn" data-act="diag">Jalankan pengecekan</button><div id="diag" class="tbl" style="margin-top:10px"></div></div>`;
  const body = { toko: () => live("sform", ["settings"], storeForm), tampilan: () => live("slook", ["settings"], lookForm), bayar: () => live("spay", ["settings"], payCard), admin: () => live("sadm", ["admins", "settings"], adm),
    wa: () => live("swa", ["wa", "errors", "settings", "admins"], wa), printer: () => live("sprint", ["bt"], printer), sistem: () => `<div class="col">${diag()}${live("sbugs", ["bugs"], bugs)}</div>` }[cur]();
  return `<div class="set-wrap ${g ? "has-group" : ""}"><nav class="set-nav card">${live("snav", ["wa", "bt", "settings", "admins", "bugs", "route"], () => GROUPS.map(([k, ic, t]) => `<a class="set-link ${cur === k && (g || window.innerWidth >= 1000) ? "on" : ""}" href="#/admin/settings/${k}"><span class="mi-ic">${svg(ic, 19)}</span><span class="sp">${t}</span><span class="mi-st">${groupStatus(k)}</span></a>`).join(""))}</nav>
    <section class="set-body"><a class="back-link only-m" href="#/admin/settings">‹ Semua pengaturan</a><h3 class="set-title only-m">${GROUP_TITLES[cur]}</h3>${body}</section>
    <div class="set-hub only-m">${live("shub", ["wa", "bt", "settings", "admins", "bugs"], groupList)}</div></div>`;
}
actions.pmform = el => {
  const m = payMethods().find(x => x.id === el.dataset?.id) || {};
  openOverlay(`<div class="sheet-head"><h3>${m.id ? "Edit metode" : "Tambah metode pembayaran"}</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <form class="col" data-form="pm" data-id="${esc(m.id || "")}"><label>Nama metode<input name="name" required value="${esc(m.name || "")}" placeholder="BCA / DANA / GoPay"></label>
  <label>Nomor rekening / nomor e-wallet & atas nama<textarea name="detail" rows="3" placeholder="1234567890 a.n. Tubi">${esc(m.detail || "")}</textarea></label>
  <label>Tautan pembayaran <span class="hint">opsional — mis. link DANA / payment link</span><input name="link" type="url" value="${esc(m.link || "")}" placeholder="https://…"></label><button class="btn pri" type="submit">Simpan</button></form>`);
};
forms.pm = async (f, fd) => {
  const id = f.dataset.id || "m" + Date.now().toString(36), item = { id, name: String(fd.get("name")).trim().slice(0, 40), detail: String(fd.get("detail") || "").trim().slice(0, 300), link: String(fd.get("link") || "").trim().slice(0, 400) };
  if (item.link && !/^https?:\/\//i.test(item.link)) throw new Error("Tautan harus diawali https://");
  const list = payMethods().map(x => x.id === id ? item : x); if (!list.some(x => x.id === id)) list.push(item);
  await setSettings({ payMethods: list }); closeOverlay(); toast("Metode pembayaran disimpan ✓");
};
actions.pmdel = async el => { if (!await confirmBox("Hapus metode ini?", "Metode tidak akan muncul lagi di checkout.", "Hapus")) return; await setSettings({ payMethods: payMethods().filter(x => x.id !== el.dataset.id) }); toast("Dihapus."); };
forms.paybase = async (f, fd) => { const cod = !!fd.get("cod"); if (!cod && !payMethods().length && !S.settings.payQris) throw new Error("Aktifkan COD atau tambahkan minimal satu metode transfer dulu."); await setSettings({ payCod: cod }); toast("Tersimpan ✓"); };
forms.qris = async (f, fd) => { const file = fd.get("qris"), d = {}; if (fd.get("qrisdel")) d.payQris = F.deleteField(); else if (file && file.size) d.payQris = await compressImage(file, 700, 200000); else throw new Error("Pilih gambar QRIS dulu."); await setSettings(d); toast("QRIS disimpan ✓"); };
forms.store = async (f, fd) => {
  const n = normPhone(fd.get("number")); if (n.length < 10) throw new Error("Nomor WhatsApp belum valid.");
  const num = k => Math.max(0, +fd.get(k) || 0);
  await setSettings({ open: !!fd.get("open"), whatsapp: n, whatsappName: String(fd.get("name") || "Admin Tubi").trim(), hours: String(fd.get("hours") || "").trim(), deliveryFee: num("fee"), freeShippingMin: num("freeMin"), taxPct: Math.min(100, num("tax")), voucherCode: String(fd.get("vcode") || "").trim().toUpperCase(), voucherPct: Math.min(100, num("vpct")), voucherMax: num("vmax") });
  toast("Pengaturan disimpan — langsung berlaku untuk semua pelanggan & bot WhatsApp.");
};
forms.look = async (f, fd) => {
  const d = { heroTitle: String(fd.get("title") || "").slice(0, 120), heroText: String(fd.get("text") || "").slice(0, 300), heroTags: String(fd.get("tags") || "").slice(0, 200) };
  const file = fd.get("hero"); if (fd.get("herodel")) d.heroImage = F.deleteField(); else if (file && file.size) d.heroImage = await compressImage(file, 900, 230000);
  await setSettings(d); toast("Tampilan beranda diperbarui ✓");
};
const cmd = (action, extra = {}) => F.setDoc(F.doc(db, "waGateway", "command"), { id: Date.now(), action, by: S.user.email || "", createdAt: F.serverTimestamp(), ...extra });
const needGateway = () => { if (waState() === "offline") throw new Error("Gateway belum tersambung, jadi perintah TIDAK dikirim. Jalankan `npm start` di folder tubi-wa-gateway dulu."); };
actions.wacmd = async el => {
  const a = el.dataset.a; needGateway();
  if (a === "test" && waState() !== "connected") throw new Error(`WhatsApp belum terhubung (status: ${WA_LABEL[waState()]}). Scan QR dulu, baru kirim pesan tes.`);
  if (a === "logout" && !await confirmBox("Putuskan WhatsApp bot?", "Sesi WhatsApp dihapus. Notifikasi berhenti sampai kamu scan QR lagi.", "Putuskan")) return;
  if (a === "restart" && !await confirmBox("Restart bot?", "Gateway akan menyambung ulang ke WhatsApp (±10 detik).", "Restart", false)) return;
  await cmd(a); toast(a === "test" ? "Pesan tes dikirim ke gateway — cek WhatsApp admin." : "Perintah diterima gateway yang sedang online.");
};
forms.wapair = async (f, fd) => { needGateway(); const p = normPhone(fd.get("phone")); if (p.length < 10) throw new Error("Nomor tidak valid."); await cmd("pair", { phone: p }); toast("Meminta kode pairing…"); };
actions.wanotify = async el => { await setSettings({ [el.dataset.k]: el.checked }); };
forms.admin = async (f, fd) => {
  if (!isMain(S.user)) throw new Error("Hanya admin utama yang bisa menambah admin.");
  const email = String(fd.get("email")).trim().toLowerCase(), phone = normPhone(fd.get("phone"));
  if (FIXED_ADMINS.includes(email)) throw new Error("Email itu sudah admin utama.");
  if (fd.get("phone") && phone.length < 10) throw new Error("Nomor WhatsApp admin belum valid.");
  await F.setDoc(F.doc(db, "admins", email), { email, name: String(fd.get("name") || "").trim().slice(0, 60), phone, createdAt: F.serverTimestamp(), by: S.user.email }); f.reset(); toast("Admin ditambahkan ✓ — akses langsung aktif.");
};
actions.admdel = async el => { if (await confirmBox("Hapus admin ini?", `${el.dataset.id} langsung kehilangan akses admin, bahkan jika sedang membuka dashboard.`, "Hapus admin")) { await F.deleteDoc(F.doc(db, "admins", el.dataset.id)); toast("Admin dihapus."); } };
actions.admphone = async el => { const a = S.admins.find(x => x.id === el.dataset.id), v = await ask({ title: "Nomor WhatsApp admin", text: "Bot mengirim notifikasi ke nomor ini.", input: "", value: a?.phone || "", placeholder: "08xxxxxxxxxx", ok: "Simpan", cancel: "Batal" }); if (v === null) return; const p = normPhone(v); if (v.trim() && p.length < 10) throw new Error("Nomor belum valid."); await F.setDoc(F.doc(db, "admins", el.dataset.id), { phone: p }, { merge: true }); toast("Nomor disimpan ✓"); };
actions.bugdone = async el => { await F.updateDoc(F.doc(db, "bugReports", el.dataset.id), { status: "selesai" }); };
actions.bugdel = async el => { if (await confirmBox("Hapus laporan ini?", "", "Hapus")) await F.deleteDoc(F.doc(db, "bugReports", el.dataset.id)); };
actions.bugshot = el => { const b = S.bugs.find(x => x.id === el.dataset.id); openOverlay(`<div class="sheet-head"><h3>Tangkapan layar</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div><img src="${esc(b.screenshot)}" alt="" style="width:100%;border-radius:14px">`, "wide"); };
actions.btconnect = async () => { try { const n = await BT.connect(); toast("Terhubung ke " + n + " ✓"); } catch (e) { if (e.name === "NotFoundError") return; throw e; } finally { emit("bt"); } };
actions.bttest = async () => { if (!BT.connected()) { try { await BT.connect(); } catch (e) { if (e.name === "NotFoundError") return; throw e; } } await BT.printTest(); toast("Tes cetak dikirim ✓"); emit("bt"); };
actions.btdisc = () => { BT.disconnect(); emit("bt"); toast("Printer diputuskan."); };
actions.btpaper = el => { BT.setPaper(+el.dataset.mm); emit("bt"); };
actions.diag = async () => {
  const box = $("#diag"), rows = []; const paint = () => box.innerHTML = rows.map(r => `<div class="r"><span class="${r[1] ? "ok" : "bad"} b">${r[1] ? "✓" : "✗"}</span><div class="mid" style="white-space:normal"><b>${r[0]}</b><small class="muted" style="white-space:normal">${esc(r[2])}</small></div></div>`).join("");
  const t = async (name, fn, hint) => { try { rows.push([name, true, String(await fn())]); } catch (e) { rows.push([name, false, (e.code || e.message) + (e.code === "permission-denied" ? " — publish firestore.rules terbaru" : hint ? " — " + hint : "")]); } paint(); };
  box.innerHTML = "Memeriksa…";
  await t("Akun yang sedang login", async () => { if (!S.isAdmin) throw new Error("bukan admin"); return `${S.profile.displayName || ""} · ${S.user.email} (${isMain(S.user) ? "admin utama" : "admin tambahan"})`; });
  await t("Baca produk", async () => `${(await F.getDocs(F.query(F.collection(db, "products"), F.limit(50)))).size} produk`);
  await t("Baca pengaturan toko", async () => (await F.getDoc(F.doc(db, "settings", "store"))).exists() ? "ada" : "belum dibuat (simpan Pengaturan toko dulu)");
  await t("Baca pesanan", async () => `${(await F.getDocs(F.query(F.collection(db, "orders"), F.limit(50)))).size} pesanan`);
  await t("Baca chat", async () => `${(await F.getDocs(F.query(F.collection(db, "chats"), F.limit(50)))).size} percakapan`);
  await t("Tulis ke Firestore", async () => { await F.setDoc(F.doc(db, "settings", "_ping"), { at: F.serverTimestamp(), by: S.user.email }); return "berhasil"; });
  await t("Status gateway WhatsApp", async () => { const s = await F.getDoc(F.doc(db, "waGateway", "status")); if (!s.exists()) throw new Error("belum ada dokumen status — gateway belum pernah jalan / beda project"); const d = s.data(); if (waState() === "offline") throw new Error(`terakhir ${d.state}, ${ago(d.updatedAt)} — gateway tidak aktif`); return `${d.state}, update ${ago(d.updatedAt)}`; }, "jalankan gateway");
};
export function more() {
  return `<div class="col"><a class="menu-item" href="#/admin/reports"><span class="mi-ic">${svg("chart", 20)}</span><span class="mi-tx"><b>Omzet & Laporan</b><small class="muted">Pendapatan harian, menu terlaris, ekspor CSV</small></span><span class="mi-ch">›</span></a>
  <div class="lbl" style="margin:8px 4px 0">Pengaturan</div><div class="menu-list">${live("mgrp", ["wa", "bt", "settings", "admins", "bugs"], groupList)}</div>
  <div class="lbl" style="margin:8px 4px 0">Lainnya</div><div class="menu-list"><a class="menu-item" href="#/"><span class="mi-ic">${svg("store", 20)}</span><span class="mi-tx"><b>Lihat toko</b><small class="muted">Tampilan yang dilihat pelanggan</small></span><span class="mi-ch">›</span></a>
  <button class="menu-item" data-act="themetoggle"><span class="mi-ic">${svg("moon", 20)}</span><span class="mi-tx"><b>Mode gelap / terang</b></span></button><button class="menu-item danger" data-act="logout"><span class="mi-ic">${svg("logout", 20)}</span><span class="mi-tx"><b>Keluar</b></span></button></div></div>`;
}

// ---- Editor tampilan foto produk ----
const applyFit = f => { const img = $("#fitimg"), box = $("#fitprev"); if (!img || !f) return; const m = f.fit.value; img.style.objectFit = m; img.style.objectPosition = `${f.fx.value}% ${f.fy.value}%`; box.classList.toggle("is-contain", m === "contain"); const fp = box.querySelector(".fp"); fp.style.left = f.fx.value + "%"; fp.style.top = f.fy.value + "%"; };
actions.fitmode = el => { const f = el.closest("form"); f.fit.value = el.dataset.m; $$("#fitseg button").forEach(b => b.classList.toggle("on", b.dataset.m === el.dataset.m)); applyFit(f); };
let fitDrag = false;
const fitSet = e => { const b = $("#fitprev"); if (!b) return; const r = b.getBoundingClientRect(), f = b.closest("form"); if (f.fit.value === "contain") return; f.fx.value = Math.round(Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100))); f.fy.value = Math.round(Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))); applyFit(f); };
document.addEventListener("pointerdown", e => { if (e.target.closest?.("#fitprev")) { fitDrag = true; e.preventDefault(); fitSet(e); } });
document.addEventListener("pointermove", e => { if (fitDrag) fitSet(e); });
document.addEventListener("pointerup", () => { fitDrag = false; });
actions.fitall = async () => { if (!await confirmBox("Tampilkan semua foto utuh?", "Semua foto produk akan ditampilkan penuh (tidak dipotong) di menu pelanggan. Bisa diubah per produk lagi.", "Terapkan", false)) return; for (const p of S.products) await F.updateDoc(F.doc(db, "products", p.id), { imageFit: "contain", imageX: 50, imageY: 50 }); toast("Semua foto kini tampil utuh ✓"); };
