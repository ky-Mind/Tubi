import { db, F, auth, A } from "./firebase.js";
import { S, emit, signIn, signOutNow, avail, ratingOf, reviewsOf, cartCount, calc, saveCart, saveFavs, statusOf, STATUS_LABEL, isMain, payMethods, payOptions } from "./data.js";
import { actions, forms, live, go, openOverlay, closeOverlay, repaint } from "./core.js";
import { $, $$, esc, rupiah, svg, stars, toast, timeText, initial, normPhone, ls, compressImage } from "./util.js";
import { msgsHtml, chatForm, toEnd, markRead } from "./chat.js";
import { confirmBox, ask, themePref, setTheme, dropzone } from "./ui.js";
import { mountLocation, pickerHtml, mapsDir, mapsView } from "./map.js";
import { bell, abaikanNotif } from "./notif.js";
import { badge, provOf, nomorOf, atasNamaOf, appName, salin, bukaAplikasi } from "./pay.js";
import { APP_VERSION, cekUpdate } from "./update.js";

const V = { q: "", cat: "Semua", fav: false, sort: "rec", voucher: "", loc: null, pay: "cod", ost: "semua" };
export const img = p => {
  let s = String(p?.image || "").trim(); if (s.startsWith("assets/")) s = "./" + s;
  return /^(data:image|https?:\/\/|\.\/|\/)/.test(s) ? s : "";
};
// Potongan foto produk (diatur admin di editor foto): posisi fokus x/y, zoom, dan rotasi. Foto aslinya tidak diubah.
const num = (v, d) => (v !== undefined && v !== null && Number.isFinite(+v) ? +v : d);
export const cropCss = p => { const x = num(p?.imageX, 50), y = num(p?.imageY, 50), z = num(p?.imageZoom, 1), r = num(p?.imageRot, 0);
  return `object-fit:${p?.imageFit === "contain" ? "contain" : "cover"};object-position:${x}% ${y}%;transform-origin:${x}% ${y}%;transform:scale(${z}) rotate(${r}deg)`; };
export const imgStyle = p => `style="${cropCss(p)}"`;
const pic = p => img(p) ? `<img src="${esc(img(p))}" alt="${esc(p.name)}" loading="lazy" ${imgStyle(p)}>` : `<span class="noimg">${svg("image", 26)}</span>`;
const prodOf = id => S.products.find(p => p.id === id);
const thumb = id => { const p = prodOf(id); return p && img(p) ? `<img src="${esc(img(p))}" alt="" ${imgStyle(p)}>` : `<span class="noimg">${svg("image", 26)}</span>`; };
const needLogin = () => { if (!S.user) { toast("Masuk dulu dengan Google ya."); signIn().catch(e => toast(e.message, "err")); return true; } return false; };
const mutCart = () => { saveCart(); emit("cart"); };
// Urutkan kategori agar "Lainnya" selalu berada di ujung daftar kategori.
const cats = () => {
  const all = [...new Set(S.products.map(p => String(p.category || "Lainnya").trim()).filter(Boolean))];
  const lainnya = all.filter(c => c.toLocaleLowerCase("id-ID") === "lainnya");
  return ["Semua", ...all.filter(c => c.toLocaleLowerCase("id-ID") !== "lainnya"), ...lainnya];
};

// ===== Shell =====
export function shell() {
  return `<div class="c-strip"><div class="in">${live("cstrip", ["settings"], strip)}<nav class="c-links">${live("cnav-d", ["route", "chatMeta"], () => navLinks(false))}</nav></div></div>
  <header class="c-top"><div class="in">
    ${live("ctop", ["route"], topLeft)}
    <div class="c-actions">
      <a class="icon-btn only-d" href="#/orders" aria-label="Pesanan saya" data-l="Pesanan">${svg("box")}</a>
      <a class="icon-btn c-chat" href="#/chat" aria-label="Chat" data-l="Chat">${svg("chat")}${live("cchat", ["chatMeta"], () => { const n = +S.chatMeta?.unreadUser || 0; return `<span class="badge ${n ? "" : "z"}">${n}</span>`; })}</a>
      ${bell("c")}
      <button class="icon-btn" data-act="cart" aria-label="Keranjang" data-l="Keranjang">${svg("bag")}${live("cbadge", ["cart"], () => `<span class="badge ${cartCount() ? "" : "z"}">${cartCount()}</span>`)}</button>
      <button class="icon-btn only-d" data-act="settings" aria-label="Pengaturan" data-l="Atur">${svg("cog")}</button>
      ${live("cacct", ["auth", "profile"], () => S.user ? `${S.isAdmin ? `<a class="btn sm only-d" href="#/admin">${svg("grid", 16)} Admin</a>` : ""}<a class="av only-d" href="#/account" title="Akun">${S.profile.photoURL ? `<img src="${esc(S.profile.photoURL)}" alt="">` : initial(S.profile.displayName)}</a>` : `<button class="btn sm c-login" data-act="login">Masuk</button>`)}
    </div>
  </div></header>
  <main id="view" class="c-main"></main>
  ${live("cbar", ["cart", "route"], cartBar)}
  <nav class="c-nav">${live("cnav-m", ["route", "chatMeta"], () => navLinks(true))}</nav>`;
}
// Bar atas: di Beranda berisi kolom pencarian; di halaman lain berisi tombol kembali + judul halaman.
const PAGE_TITLE = { "/orders": "Pesanan Saya", "/chat": "Chat dengan Tubi", "/account": "Akun Saya", "/checkout": "Checkout", "/pay": "Pembayaran" };
const pageKey = () => { const p = location.hash.slice(1) || "/"; return p.startsWith("/pay/") ? "/pay" : PAGE_TITLE[p] ? p : "/"; };
function topLeft() {
  const k = pageKey();
  if (k === "/") return `<a class="logo" href="#/"><img src="./tubi-icon.png" alt=""><span>tubi</span></a>
    <form class="c-search" data-form="find">${svg("search", 18)}<input type="search" placeholder="Cari roti kukus, topokki, cilok…" data-input="search" id="q" value="${esc(V.q)}" aria-label="Cari menu"><button class="go" type="submit" aria-label="Cari">${svg("search", 18)}</button></form>`;
  const back = k === "/pay" ? "#/orders" : "#/";
  return `<a class="icon-btn c-back" href="${back}" aria-label="Kembali">${svg("back", 22)}</a><a class="logo only-d" href="#/"><img src="./tubi-icon.png" alt=""><span>tubi</span></a><span class="c-sep only-d"></span><h1 class="c-title">${PAGE_TITLE[k]}</h1>`;
}
const NAV = [["/", "home", "Beranda"], ["/orders", "box", "Pesanan"], ["/chat", "chat", "Chat"], ["/account", "user", "Saya"]];
const strip = () => { const st = S.settings, open = st.open !== false; return `<span class="open"><i class="${open ? "" : "off"}"></i>${open ? "Buka" : "Tutup"}${st.hours ? " · " + esc(st.hours) : ""}</span>${st.whatsapp ? `<a target="_blank" rel="noopener" href="https://wa.me/${esc(st.whatsapp)}">WhatsApp ${esc(st.whatsapp)}</a>` : ""}<span>Halal · Fresh setiap hari</span>`; };
forms.find = f => { V.q = f.q.value; if ((location.hash.slice(1) || "/") !== "/") go("/"); else repaint("feed"); setTimeout(() => document.querySelector(".feed-h")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); };
function navLinks(icons) {
  const p = location.hash.slice(1) || "/", unread = +S.chatMeta?.unreadUser || 0;
  return NAV.map(([h, ic, lb]) => `<a href="#${h}" class="${p === h ? "on" : ""}">${icons ? svg(ic, 22) : ""}${lb}${h === "/chat" && unread ? `<span class="badge">${unread}</span>` : ""}</a>`).join("");
}
function cartBar() {
  const n = cartCount(), p = location.hash.slice(1) || "/";
  if (!n || p === "/checkout" || p === "/chat" || p.startsWith("/pay/")) return "";
  return `<div class="cartbar" data-act="cart" role="button"><span class="cb-ic">${svg("bag", 20)}<span class="badge">${n}</span></span><div class="sp"><small style="opacity:.8">Total belanja</small><b style="display:block;font:700 17px var(--fd)">${rupiah(calc().subtotal)}</b></div><span class="cb-go">Checkout</span></div>`;
}

// ===== Beranda =====
const filtered = () => {
  const q = V.q.trim().toLowerCase();
  let l = S.products.filter(p => (V.cat === "Semua" || (p.category || "Lainnya") === V.cat) && (!V.fav || S.favs.includes(p.id)) &&
    (!q || `${p.name} ${p.category} ${(p.attributes || []).join(" ")} ${p.description || ""}`.toLowerCase().includes(q)));
  if (V.sort === "low") l.sort((a, b) => a.price - b.price); else if (V.sort === "high") l.sort((a, b) => b.price - a.price); else if (V.sort === "rate") l.sort((a, b) => ratingOf(b) - ratingOf(a));
  return l;
};
const top = () => [...S.products].filter(avail).sort((a, b) => ratingOf(b) - ratingOf(a) || reviewsOf(b.id).length - reviewsOf(a.id).length);
const card = p => {
  const rs = reviewsOf(p.id).length, on = S.favs.includes(p.id), ok = avail(p), best = top().slice(0, 3).some(x => x.id === p.id);
  return `<article class="prod"><button class="fav ${on ? "on" : ""}" data-act="fav" data-id="${p.id}" aria-label="Favorit">${svg("heart", 16)}</button>
    <div class="ph" data-act="detail" data-id="${p.id}">${pic(p)}${best && ok ? `<span class="tag">TERLARIS</span>` : ""}</div>${ok ? "" : `<div class="sold"><span>HABIS</span></div>`}
    <div class="bd"><h3 data-act="detail" data-id="${p.id}">${esc(p.name)}</h3>
    <div class="price">${rupiah(p.price)}</div>
    <div class="meta"><span class="stars">★</span>${ratingOf(p).toFixed(1)}${rs ? `<span>· ${rs} ulasan</span>` : ""}</div>
    <div class="pr"><span class="cat-l">${esc(p.category || "")}</span><button class="add" data-act="add" data-id="${p.id}" ${ok ? "" : "disabled"} aria-label="Tambah ke keranjang">${svg("plus", 18)}</button></div></div></article>`;
};
const grid = () => {
  if (S.errors.products) return `<div class="alert">Menu belum bisa dimuat (${esc(S.errors.products)}). Pastikan <code>firestore.rules</code> sudah dipublish.</div>`;
  const l = filtered();
  if (!l.length) return `<div class="empty">${S.products.length ? "Menu tidak ditemukan. Coba kata kunci lain." : "Menu belum tersedia. Admin sedang menyiapkannya."}</div>`;
  return `<div class="prods">${l.map(card).join("")}</div>`;
};
const hero = () => {
  const st = S.settings, tags = String(st.heroTags ?? "Fresh setiap hari, Antar cepat, Harga pelajar").split(",").map(x => x.trim()).filter(Boolean);
  const title = String(st.heroTitle || "Lapar?\nPesan Tubi."), text = st.heroText || "Roti kukus, topokki, cilok, dan jajanan favorit — langsung dari HP, status pesanan terlihat real-time.";
  return `${st.open === false ? `<div class="alert closed">Toko sedang tutup. Kamu tetap bisa lihat menu; pesanan dibuka lagi saat toko buka${st.hours ? " (" + esc(st.hours) + ")" : ""}.</div>` : ""}
  <section class="banner"><span class="noren"></span><div class="bn-tx"><div class="tags">${tags.slice(0, 3).map(t => `<span>${esc(t)}</span>`).join("")}</div><h1>${esc(title).replace(/\n/g, "<br>")}</h1><p>${esc(text)}</p><a class="btn pri sm bn-cta" href="#/" data-act="tomenu">Pesan sekarang</a></div>
  <div class="bn-img"><img src="${esc(st.heroImage || "./assets/menu-poster.jpg")}" alt="" onerror="this.parentNode.remove()"></div></section>
  <div class="usp"><div><i>${svg("fresh", 18)}</i>Fresh tiap hari</div><div><i>${svg("bike", 18)}</i>Antar cepat</div><div><i>${svg("coin", 18)}</i>Harga pelajar</div><div><i>${svg("halal", 18)}</i>Halal</div></div>`;
};
// ikon kategori: foto produk pertama di kategori itu
const catIcon = c => { const p = S.products.find(x => (x.category || "Lainnya") === c && img(x)); return p ? `<img src="${esc(img(p))}" alt="" loading="lazy" ${imgStyle(p)}>` : svg("image", 24); };
const katHtml = () => `<div class="kat" aria-label="Kategori menu"><button class="${V.cat === "Semua" && !V.fav ? "on" : ""}" data-act="cat" data-c="Semua"><span class="ki c">${svg("grid", 26)}</span>Semua</button>${cats().slice(1).map(c => `<button class="${V.cat === c && !V.fav ? "on" : ""}" data-act="cat" data-c="${esc(c)}"><span class="ki">${catIcon(c)}</span>${esc(c)}</button>`).join("")}<button class="${V.fav ? "on" : ""}" data-act="favonly"><span class="ki c">${svg("heart", 26)}</span>Favorit</button></div>`;
const flashHtml = () => {
  const l = top().slice(0, 10); if (l.length < 3) return "";
  return `<section class="sec flash"><div class="sec-h"><h2>${svg("fire", 20)} Terlaris</h2><span class="tick">Paling disukai</span><a class="more" href="#/" data-act="sortrate">Lihat semua ›</a></div>
  <div class="hscroll">${l.map((p, i) => { const r = ratingOf(p); return `<div class="mini" data-act="detail" data-id="${p.id}">${i < 3 ? `<span class="rank">#${i + 1}</span>` : ""}<div class="ph">${pic(p)}</div><div class="bd"><b>${rupiah(p.price)}</b><small>${esc(p.name)}</small><div class="bar"><i style="width:${Math.max(20, Math.round(r / 5 * 100))}%"></i><span>★ ${r.toFixed(1)}</span></div></div></div>`; }).join("")}</div></section>`;
};
const SORTS = [["rec", "Terkait"], ["rate", "Rating"], ["low", "Termurah"], ["high", "Termahal"]];
const feed = () => {
  const label = V.fav ? "Favorit kamu" : V.cat !== "Semua" ? V.cat : V.q.trim() ? `Hasil "${V.q.trim()}"` : "Rekomendasi untukmu";
  return `<div class="feed-h"><h2>${esc(label)}</h2><span class="chip">${filtered().length} menu</span></div>${grid()}`;
};
export function home() {
  return `${live("hero", ["settings"], hero)}
  <section class="sec"><div class="sec-h"><h2>Kategori</h2></div>${live("cats", ["products"], katHtml)}</section>
  ${live("flash", ["products", "reviews"], flashHtml)}
  ${live("sorts", [], () => `<div class="sorts">${SORTS.map(([k, l]) => `<button class="${V.sort === k ? "on" : ""}" data-act="sortby" data-s="${k}">${l}</button>`).join("")}</div>`)}
  ${live("feed", ["products", "reviews", "errors"], feed)}`;
}
actions.search = t => { V.q = t.value; $$('[data-input="search"]').forEach(i => { if (i !== t) i.value = V.q; }); repaint("feed"); };
actions.sortby = el => { V.sort = el.dataset.s; repaint("sorts"); repaint("feed"); };
actions.sortrate = () => { V.sort = "rate"; V.cat = "Semua"; V.fav = false; repaint("sorts"); repaint("cats"); repaint("feed"); document.querySelector(".sorts")?.scrollIntoView({ behavior: "smooth" }); };
actions.tomenu = () => document.querySelector(".kat")?.scrollIntoView({ behavior: "smooth", block: "center" });
actions.cat = el => { V.cat = el.dataset.c; V.fav = false; repaint("cats"); repaint("feed"); };
actions.favonly = () => { V.fav = !V.fav; repaint("cats"); repaint("feed"); };
actions.fav = el => { const id = el.dataset.id, i = S.favs.indexOf(id); i < 0 ? S.favs.push(id) : S.favs.splice(i, 1); saveFavs(); repaint("feed"); toast(i < 0 ? "Ditambahkan ke favorit" : "Dihapus dari favorit"); };
actions.login = () => signIn().catch(e => toast(e.message, "err"));
actions.logout = async () => {
  if (!await confirmBox("Keluar dari akun?", "Kamu bisa masuk lagi kapan saja dengan Google.", "Keluar", false)) return;
  await signOutNow(); go("/", true); toast("Kamu sudah keluar.");
};
actions.add = el => { const p = prodOf(el.dataset.id); if (!p || !avail(p)) return; addToCart(p, 1); toast(`${p.name} ditambahkan`); };
export function addToCart(p, n) { const x = S.cart.find(c => c.id === p.id); x ? (x.qty += n) : S.cart.push({ id: p.id, name: p.name, price: +p.price, qty: n }); mutCart(); }

// ===== Detail produk =====
actions.detail = el => {
  const p = prodOf(el.dataset.id); if (!p) return;
  const rs = reviewsOf(p.id).length, ok = avail(p);
  openOverlay(`<div class="sheet-head"><span class="chip">${esc(p.category || "Menu")}</span><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="pd pd-wide"><div class="big">${pic(p)}</div>
  <div class="col"><div class="pd-price"><b>${rupiah(p.price)}</b>${ok ? `<span class="xs muted">Harga sudah termasuk kemasan</span>` : `<span class="chip st-dibatalkan">Stok habis</span>`}</div>
  <div class="pd-name">${esc(p.name)}</div>
  <div class="pd-rate"><span class="stars">${stars(ratingOf(p))}</span><b style="color:var(--ink)">${ratingOf(p).toFixed(1)}</b><span>· ${rs} ulasan</span></div>
  ${(p.attributes || []).length ? `<div class="row wrap">${p.attributes.map(a => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : ""}
  ${p.description ? `<div><div class="lbl">Deskripsi</div><p class="muted">${esc(p.description)}</p></div>` : ""}
  <div><h3>Ulasan pembeli</h3>${live("rv", ["reviews", "auth"], () => reviewBox(p))}</div></div></div>
  <div class="pd-buy"><div class="qty"><button data-act="dq" data-d="-1" aria-label="Kurangi">${svg("minus", 16)}</button><b id="dqn">1</b><button data-act="dq" data-d="1" aria-label="Tambah">${svg("plus", 16)}</button></div>
  <button class="btn alt" data-act="addn" data-id="${p.id}" ${ok ? "" : "disabled"}>${svg("bag", 18)} Keranjang</button><button class="btn pri" data-act="buy" data-id="${p.id}" ${ok ? "" : "disabled"}>Beli sekarang</button></div>`, "wide");
};
actions.close = () => closeOverlay();
actions.dq = el => { const n = $("#dqn"); n.textContent = Math.max(1, Math.min(50, +n.textContent + +el.dataset.d)); };
actions.addn = el => { const p = prodOf(el.dataset.id); addToCart(p, +$("#dqn").textContent || 1); closeOverlay(); toast(`${p.name} ditambahkan`); };
actions.buy = el => { const p = prodOf(el.dataset.id); addToCart(p, +$("#dqn").textContent || 1); closeOverlay(); go("/checkout"); };
function reviewBox(p) {
  const rs = reviewsOf(p.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)), mine = S.user && rs.find(r => r.userId === S.user.uid);
  const form = !S.user ? `<button class="btn full" data-act="login">Masuk untuk memberi ulasan</button>` : S.isAdmin ? "" :
    `<form class="col" data-form="review" data-id="${p.id}"><div class="pick" id="pick">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-act="pick" data-n="${i}" class="${i <= (mine?.rating || 5) ? "on" : ""}">★</button>`).join("")}</div><input type="hidden" name="rating" value="${mine?.rating || 5}"><textarea name="text" maxlength="500" placeholder="Tulis komentar tentang menu ini…">${esc(mine?.text || "")}</textarea><button class="btn pri" type="submit">${mine ? "Perbarui ulasan" : "Kirim ulasan"}</button></form>`;
  return `<div class="row"><b style="font-size:32px">${ratingOf(p).toFixed(1)}</b>${stars(ratingOf(p), 18)}<span class="muted sm">${rs.length} ulasan</span></div>${form}
  ${rs.length ? rs.map(r => `<div class="rv"><span class="av">${r.photoURL ? `<img src="${esc(r.photoURL)}" alt="">` : initial(r.name)}</span><div class="tx"><div class="row wrap"><b>${esc(r.name || "Pelanggan")}</b>${stars(r.rating)}</div>${r.text ? `<p>${esc(r.text)}</p>` : ""}<small class="muted">${timeText(r.createdAt)}</small>${r.reply ? `<div class="reply"><b class="sm">Balasan Tubi</b><p>${esc(r.reply)}</p></div>` : ""}
    ${S.isAdmin ? `<div class="row"><button class="btn sm ghost" data-act="rvreply" data-id="${r.id}">Balas</button><button class="btn sm ghost danger" data-act="rvdel" data-id="${r.id}">Hapus</button></div>` : (S.user && r.userId === S.user.uid ? `<button class="btn sm ghost danger" data-act="rvdel" data-id="${r.id}">Hapus</button>` : "")}</div></div>`).join("") : `<div class="empty" style="margin-top:10px">Belum ada ulasan. Jadilah yang pertama!</div>`}`;
}
actions.pick = el => { const n = +el.dataset.n, f = el.closest("form"); f.rating.value = n; $$("#pick button", f).forEach(b => b.classList.toggle("on", +b.dataset.n <= n)); };
forms.review = async (f, fd) => {
  const pid = f.dataset.id;
  await F.setDoc(F.doc(db, "productReviews", `${pid}_${S.user.uid}`), { productId: pid, userId: S.user.uid, name: S.profile.displayName || "Pelanggan", photoURL: S.profile.photoURL || "", rating: Math.min(5, Math.max(1, +fd.get("rating") || 5)), text: String(fd.get("text") || "").trim().slice(0, 500), createdAt: F.serverTimestamp() }, { merge: true });
  toast("Ulasan tersimpan. Terima kasih!");
};
actions.rvdel = async el => { if (await confirmBox("Hapus ulasan ini?", "", "Hapus")) await F.deleteDoc(F.doc(db, "productReviews", el.dataset.id)); };
actions.rvreply = async el => { const r = S.reviews.find(x => x.id === el.dataset.id), t = await ask({ title: "Balas ulasan", input: "", value: r?.reply || "", placeholder: "Tulis balasan untuk pelanggan…", ok: "Kirim balasan" }); if (t !== null) await F.updateDoc(F.doc(db, "productReviews", el.dataset.id), { reply: t.trim(), repliedAt: F.serverTimestamp() }); };

// ===== Keranjang =====
actions.cart = () => openOverlay(`<div class="sheet-head"><h3>Keranjang</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>${live("cartlist", ["cart", "products"], cartList)}`, "drawer");
function cartList() {
  if (!S.cart.length) return `<div class="empty">Keranjang masih kosong.<br><button class="btn pri" style="margin-top:12px" data-act="close">Lihat menu</button></div>`;
  const c = calc(V.voucher);
  return S.cart.map(x => `<div class="line"><div class="thumb">${thumb(x.id)}</div><div class="nm"><b>${esc(x.name)}</b><div class="pc">${rupiah(x.price * x.qty)}</div><div class="muted xs">${rupiah(x.price)} / porsi</div></div>
    <div class="qty"><button data-act="cq" data-id="${x.id}" data-d="-1" aria-label="Kurangi">${svg("minus", 16)}</button><b>${x.qty}</b><button data-act="cq" data-id="${x.id}" data-d="1" aria-label="Tambah">${svg("plus", 16)}</button></div>
    <button class="icon-btn sm-ic" data-act="crm" data-id="${x.id}" aria-label="Hapus dari keranjang">${svg("trash", 17)}</button></div>`).join("")
    + `<button class="btn ghost danger full" style="margin-top:6px" data-act="cclear">${svg("trash", 16)} Kosongkan keranjang</button>
    <div class="cart-foot"><div class="tot"><span class="muted xs">Subtotal (${cartCount()} item)</span><b>${rupiah(c.subtotal)}</b></div><button class="btn pri" data-act="tocheckout">Checkout (${cartCount()})</button></div>`;
}
actions.cq = el => { const x = S.cart.find(c => c.id === el.dataset.id); if (!x) return; x.qty += +el.dataset.d; if (x.qty <= 0) S.cart.splice(S.cart.indexOf(x), 1); mutCart(); };
actions.crm = el => { S.cart = S.cart.filter(c => c.id !== el.dataset.id); mutCart(); };
actions.cclear = async () => { if (await confirmBox("Kosongkan keranjang?", "Semua item di keranjang akan dihapus.", "Kosongkan")) { S.cart = []; mutCart(); } };
actions.tocheckout = () => { closeOverlay(); go("/checkout"); };

// ===== Checkout =====


export function checkout() {
  if (!S.cart.length) return `<div class="empty">Keranjang kosong. <a class="btn pri" href="#/" style="margin-left:8px">Pilih menu</a></div>`;
  const p = S.profile, opts = payOptions(); if (!opts.some(o => o.key === V.pay)) V.pay = opts[0].key;
  return `<div class="two">
  <form class="col" data-form="order" id="coform"><div class="card col addr-card"><div class="sec-t">${svg("pin", 18)} Alamat pengantaran</div>
    ${S.user ? "" : `<div class="alert">Masuk dengan Google dulu untuk membuat pesanan. <button type="button" class="btn sm pri" data-act="login">Masuk</button></div>`}
    <div class="grid2"><label>Nama penerima<input name="name" required value="${esc(p.recipientName || p.displayName || "")}"></label><label>No. WhatsApp<input name="phone" required inputmode="tel" placeholder="08xxxxxxxxxx" value="${esc(p.phone || "")}"></label></div>
    <div><div class="lbl">Titik lokasi pengantaran</div>${pickerHtml("co")}</div>
    <label>Alamat lengkap <span class="hint">(terisi otomatis dari titik peta — tambahkan patokan / nomor rumah)</span><textarea name="address" id="coaddr" data-input="addrtype" placeholder="Jalan, nomor rumah, patokan…">${esc(p.address || "")}</textarea></label>
    <label>Catatan untuk penjual <span class="hint">(opsional)</span><input name="note" placeholder="Misal: pedas level 2"></label></div>
    <div class="card col"><div class="sec-t">${svg("tag", 18)} Metode pembayaran</div><div class="paybox">${opts.map(o => `<label class="pay"><input type="radio" name="pay" value="${esc(o.key)}" data-change="paychg" ${V.pay === o.key ? "checked" : ""}>${o.method && !o.method.qris ? badge(o.method, 40) : `<span class="pay-ic">${svg(o.kind === "cod" ? "cash" : o.key === "qris" ? "qr" : "wallet", 22)}</span>`}<span><b>${esc(o.name)}</b><small class="muted">${esc(o.method && !o.method.qris ? `${provOf(o.method)?.type === "bank" ? "Transfer bank" : "E-wallet"} · ${nomorOf(o.method)}${atasNamaOf(o.method) ? " a.n. " + atasNamaOf(o.method) : ""}` : o.hint)}</small></span></label>`).join("")}</div>
    <div id="paynote" class="alert ok ${opts.find(o => o.key === V.pay)?.kind === "transfer" ? "" : "hidden"}">Setelah menekan <b>Buat pesanan</b>, kamu akan diarahkan ke halaman pembayaran (rekening / e-wallet / QRIS) untuk menyelesaikan pembayaran dan mengunggah bukti.</div></div>
    ${live("cocta", ["cart", "settings"], () => `<div class="co-cta"><div class="tot"><span class="muted xs">Total pembayaran</span><b>${rupiah(calc(V.voucher).total)}</b></div><button class="btn pri" type="submit">Buat pesanan</button></div>`)}</form>
  <div class="col"><div class="card"><div class="sec-t" style="margin-bottom:8px"><img src="./tubi-icon.png" alt="" style="width:22px;border-radius:6px"> Pesanan dari Tubi</div>${live("sum", ["cart", "settings", "products"], sumHtml)}</div>
    <div class="card"><div class="sec-t" style="margin-bottom:10px">${svg("tag", 18)} Voucher Tubi</div><div class="row"><input id="vch" placeholder="Masukkan kode voucher" value="${esc(V.voucher)}" style="text-transform:uppercase"><button type="button" class="btn yel" data-act="voucher">Pakai</button></div></div></div></div>`;
}
export function afterCheckout() {
  if (!S.cart.length) return; V.loc = V.loc || S.profile.location || null;
  mountLocation("co", V.loc, (loc, addr) => { V.loc = loc; const a = $("#coaddr"); if (addr && a && (!a.value.trim() || a.dataset.auto === "1")) { a.value = addr; a.dataset.auto = "1"; } });
}
actions.addrtype = t => { t.dataset.auto = "0"; };
actions.paychg = t => { V.pay = t.value; $("#paynote")?.classList.toggle("hidden", payOptions().find(o => o.key === V.pay)?.kind !== "transfer"); };
function sumHtml() {
  const c = calc(V.voucher);
  return `<div>${S.cart.map(x => `<div class="line"><div class="thumb">${thumb(x.id)}</div><div style="flex:1;min-width:0"><b>${esc(x.name)}</b><div class="muted sm">${x.qty} × ${rupiah(x.price)}</div></div><b>${rupiah(x.qty * x.price)}</b></div>`).join("")}</div>
  <div class="sum" style="margin-top:10px"><div><span class="muted">Subtotal</span><span>${rupiah(c.subtotal)}</span></div>${c.discount ? `<div><span class="muted">Voucher</span><span class="ok">− ${rupiah(c.discount)}</span></div>` : ""}<div><span class="muted">Ongkir</span><span>${c.fee ? rupiah(c.fee) : "Gratis"}</span></div>${c.tax ? `<div><span class="muted">Pajak</span><span>${rupiah(c.tax)}</span></div>` : ""}<div class="t"><span>Total</span><span>${rupiah(c.total)}</span></div></div>`;
}
actions.voucher = () => { V.voucher = ($("#vch").value || "").trim().toUpperCase(); const c = calc(V.voucher); toast(c.vOk ? "Voucher berhasil dipakai" : "Kode voucher tidak valid.", c.vOk ? "" : "err"); repaint("sum"); repaint("cocta"); };
actions.copy = async el => {
  const ok = await salin(el.dataset.t); if (!ok) return toast("Tidak bisa menyalin otomatis.", "err");
  if (!el._asli) el._asli = el.innerHTML; el.innerHTML = `${svg("check", 16)} Tersalin`; el.classList.add("tersalin");
  clearTimeout(el._t); el._t = setTimeout(() => { el.innerHTML = el._asli; el.classList.remove("tersalin"); }, 1800);
};
forms.order = async (f, fd) => {
  if (needLogin()) return;
  if (S.settings.open === false) throw new Error("Toko sedang tutup. Coba lagi nanti.");
  const name = String(fd.get("name")).trim(), phone = String(fd.get("phone")).trim(), note = String(fd.get("note") || "").trim();
  let address = String(fd.get("address") || "").trim();
  if (normPhone(phone).length < 10) throw new Error("Nomor WhatsApp belum valid.");
  if (!address && !V.loc) throw new Error("Tandai titik lokasi di peta atau isi alamat.");
  if (!address) address = `Titik peta: ${V.loc.lat}, ${V.loc.lng}`;
  const opt = payOptions().find(o => o.key === fd.get("pay")) || payOptions()[0], method = opt.kind, c = calc(V.voucher);

  const ref = await F.addDoc(F.collection(db, "orders"), { userId: S.user.uid, email: S.user.email || "", customerName: name, recipientName: name, phone, address, note,
    mapsUrl: mapsView({ location: V.loc, address }), ...(V.loc ? { location: V.loc } : {}),
    items: S.cart.map(x => ({ id: x.id, name: x.name, price: x.price, qty: x.qty })), subtotal: c.subtotal, discount: c.discount, deliveryFee: c.fee, tax: c.tax, voucher: c.vOk ? V.voucher : "", total: c.total,
    payment: { method, status: "unpaid", via: opt.name, viaKey: opt.key }, status: "menunggu", createdAt: F.serverTimestamp() });
  F.addDoc(F.collection(db, "notifications"), { type: "new_order", orderId: ref.id, userId: S.user.uid, title: "Pesanan baru", body: `Pesanan baru dari ${name}`, read: false, createdAt: F.serverTimestamp() }).catch(() => {});
  const keep = { recipientName: name, phone, address, ...(V.loc ? { location: V.loc } : {}) };
  F.setDoc(F.doc(db, "users", S.user.uid), keep, { merge: true }).catch(() => {}); Object.assign(S.profile, keep);
  S.cart = []; V.voucher = ""; mutCart(); go(method === "transfer" ? "/pay/" + ref.id : "/orders");
};

// ===== Pesanan =====
const FLOW = ["menunggu", "diproses", "siap", "selesai"];
const payChip = o => { const m = o.payment?.method; if (!m) return ""; const stt = statusOf(o.status);
  if (stt === "dibatalkan") return o.payment?.status === "paid" ? `<span class="chip">Sudah dibayar · hubungi admin</span>` : "";
  if (stt === "selesai" && m === "cod") return `<span class="chip st-selesai">COD · Lunas</span>`; const via = o.payment?.via ? ` · ${esc(o.payment.via)}` : "", s = o.payment?.status;
  return m === "cod" ? `<span class="chip">COD</span>` : s === "paid" ? `<span class="chip st-selesai">Lunas${via}</span>` : s === "issue" ? `<span class="chip st-dibatalkan">Ada kendala pembayaran${via}</span>` : o.paymentProof ? `<span class="chip st-diproses">Bukti dicek admin${via}</span>` : `<span class="chip st-menunggu">Belum dibayar${via}</span>`; };
const orderCard = o => {
  const st = statusOf(o.status), idx = FLOW.indexOf(st), needProof = o.payment?.method === "transfer" && o.payment?.status !== "paid" && st !== "dibatalkan";
  return `<div class="card ord"><div class="ord-top"><div class="shop"><img src="./tubi-icon.png" alt="">Tubi <span class="muted xs" style="font-weight:600">#${esc(o.id.slice(0, 6).toUpperCase())} · ${timeText(o.createdAt)}</span></div><span class="chip st-${st}">${STATUS_LABEL[st]}</span></div>
  ${st === "dibatalkan" ? "" : `<div class="steps">${FLOW.map((_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("")}</div>`}
  <div class="items">${(o.items || []).map(i => `<div class="it"><span class="thumb xs">${thumb(i.id)}</span><span class="sp">${i.qty}× ${esc(i.name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join("")}</div>
  <div class="row wrap">${payChip(o)}${o.location?.lat ? `<a class="chip" target="_blank" rel="noopener" href="${esc(mapsView(o))}">${svg("pin", 14)} Lokasi terkirim</a>` : ""}</div>
  <div class="row wrap"><span class="ord-tot">Total pesanan: <b>${rupiah(o.total)}</b></span><span class="sp"></span>
  ${needProof ? `<button class="btn sm pri" data-act="paynow" data-id="${o.id}">${o.paymentProof ? "Lihat pembayaran" : "Bayar sekarang"}</button>` : ""}
  ${st === "menunggu" ? `<button class="btn sm danger" data-act="cancel" data-id="${o.id}">Batalkan</button>` : ""}
  ${st === "selesai" ? (o.review ? `<span class="chip">★ ${o.review.rating}</span>` : `<button class="btn sm" data-act="rate" data-id="${o.id}">Beri ulasan</button>`) : ""}
  <button class="btn sm" data-act="reorder" data-id="${o.id}">Pesan lagi</button></div></div>`;
};
const OTABS = ["semua", ...FLOW, "dibatalkan"];
const otabs = () => `<div class="otabs">${OTABS.map(k => { const n = k === "semua" ? 0 : S.orders.filter(o => statusOf(o.status) === k).length; return `<button class="${V.ost === k ? "on" : ""}" data-act="ost" data-k="${k}">${k === "semua" ? "Semua" : STATUS_LABEL[k]}${n && k !== "selesai" && k !== "dibatalkan" ? `<small>${n}</small>` : ""}</button>`; }).join("")}</div>`;
const olist = () => {
  if (S.errors.orders) return `<div class="alert">Pesanan belum bisa dimuat (${esc(S.errors.orders)}). Publish <code>firestore.rules</code> terbaru.</div>`;
  const l = S.orders.filter(o => V.ost === "semua" || statusOf(o.status) === V.ost);
  return l.length ? `<div class="col">${l.map(orderCard).join("")}</div>` : `<div class="empty">${S.orders.length ? "Tidak ada pesanan dengan status ini." : "Belum ada pesanan."}<br><a class="btn pri" href="#/" style="margin-top:12px">Mulai belanja</a></div>`;
};
export function orders() {
  if (!S.user) return loginCard("Masuk untuk melihat pesananmu", "Pesanan dan statusnya tampil real-time di sini.");
  return `${live("otabs", ["orders"], otabs)}${live("olist", ["orders", "errors", "products"], olist)}`;
}
actions.ost = el => { V.ost = el.dataset.k; repaint("otabs"); repaint("olist"); };
actions.cancel = async el => { if (await confirmBox("Batalkan pesanan ini?", "Pesanan yang sudah dibatalkan tidak bisa diaktifkan lagi.", "Ya, batalkan") && abaikanNotif.add(el.dataset.id + ":dibatalkan")) await F.updateDoc(F.doc(db, "orders", el.dataset.id), { status: "dibatalkan", updatedAt: F.serverTimestamp() }); };
actions.reorder = el => { const o = S.orders.find(x => x.id === el.dataset.id); (o?.items || []).forEach(i => { const p = prodOf(i.id); if (p && avail(p)) addToCart(p, i.qty); }); toast("Ditambahkan ke keranjang"); actions.cart(); };
actions.rate = el => openOverlay(`<div class="sheet-head"><h3>Beri ulasan</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <form class="col" data-form="rateorder" data-id="${el.dataset.id}"><div class="pick" id="pick">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-act="pick" data-n="${i}" class="on">★</button>`).join("")}</div><input type="hidden" name="rating" value="5"><textarea name="text" placeholder="Bagaimana rasanya? (opsional)" maxlength="500"></textarea><button class="btn pri" type="submit">Kirim</button></form>`);
forms.rateorder = async (f, fd) => {
  const o = S.orders.find(x => x.id === f.dataset.id), rating = +fd.get("rating") || 5, text = String(fd.get("text") || "").trim();
  await F.updateDoc(F.doc(db, "orders", o.id), { review: { rating, text } });
  for (const i of o.items || []) F.setDoc(F.doc(db, "productReviews", `${i.id}_${S.user.uid}`), { productId: i.id, userId: S.user.uid, name: S.profile.displayName || "Pelanggan", photoURL: S.profile.photoURL || "", rating, text, createdAt: F.serverTimestamp() }, { merge: true }).catch(() => {});
  closeOverlay(); toast("Terima kasih atas ulasannya!");
};
actions.proof = el => openOverlay(`<div class="sheet-head"><h3>Bukti pembayaran</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>${S.settings.payBank ? `<div class="payline"><b>Transfer ke</b><pre>${esc(S.settings.payBank)}</pre></div>` : ""}${S.settings.payQris ? `<img class="qris" src="${esc(S.settings.payQris)}" alt="QRIS">` : ""}
  <form class="col" data-form="proof" data-id="${el.dataset.id}" style="margin-top:12px">${dropzone("proof", "", "Pilih foto bukti transfer")}<button class="btn pri" type="submit">Kirim bukti</button></form>`);
forms.proof = async (f, fd) => {
  const file = fd.get("proof"); if (!file?.size) throw new Error("Pilih foto bukti transfer dulu.");
  const o = S.orders.find(x => x.id === f.dataset.id), proof = await compressImage(file, 1000), ref = F.doc(db, "orders", f.dataset.id);
  // status pembayaran kembali "menunggu dicek" (juga setelah ada kendala) + waktu unggah, agar admin dapat notifikasi
  try { await F.updateDoc(ref, { paymentProof: proof, payment: { ...(o?.payment || {}), status: "unpaid", note: "", proofAt: Date.now() }, updatedAt: F.serverTimestamp() }); }
  catch (e) { if (e.code !== "permission-denied") throw e; await F.updateDoc(ref, { paymentProof: proof }); }   // rules lama
  closeOverlay();
};

// ===== Chat =====
// Daftar nomor WhatsApp admin (utama + admin lain dari Pengaturan → Toko & biaya)
const waList = () => [...(S.settings.whatsapp ? [{ name: S.settings.whatsappName || "Admin Tubi", number: S.settings.whatsapp }] : []), ...(S.settings.waContacts || [])].filter(c => c.number);
actions.wapilih = () => openOverlay(`<div class="sheet-head"><h3>Chat lewat WhatsApp</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <p class="muted sm" style="margin:-4px 0 10px">Pilih admin yang mau kamu hubungi.</p><div class="tema-list">${waList().map((c, i) => `<a target="_blank" rel="noopener" href="https://wa.me/${esc(c.number)}" class="wa-pil"><i>${svg("wa", 20)}</i><span><b>${esc(c.name)}</b><small>${i ? "Admin" : "Admin utama"} · +${esc(c.number)}</small></span>${svg("send", 16)}</a>`).join("")}</div>`);
export function chat() {
  if (!S.user) return loginCard("Masuk untuk chat dengan admin", "Balasan admin muncul langsung di sini.");
  const wa = S.settings.whatsapp;
  return `<div class="chat"><div class="chat-head"><img class="av" src="./tubi-icon.png" alt=""><div style="min-width:0"><b>${esc(S.settings.whatsappName || "Admin Tubi")}</b><div class="muted xs">${S.settings.open === false ? "Toko sedang tutup" : esc(S.settings.hours ? "Buka " + S.settings.hours : "Biasanya membalas dalam beberapa menit")}</div></div><span class="sp"></span>${waList().length > 1 ? `<button type="button" class="icon-btn" data-act="wapilih" aria-label="Pilih admin WhatsApp">${svg("wa", 18)}</button>` : wa ? `<a class="icon-btn" target="_blank" rel="noopener" href="https://wa.me/${esc(wa)}" aria-label="Chat lewat WhatsApp">${svg("wa", 18)}</a>` : ""}</div>
  ${live("msgs", ["msgs", "errors"], () => `<div class="msgs">${S.errors.msgs ? `<div class="alert">Chat ditolak Firestore. Publish <code>firestore.rules</code> terbaru.</div>` : msgsHtml("user")}</div>`, () => { toEnd(); if (S.user && +S.chatMeta?.unreadUser > 0 && (location.hash.slice(1) === "/chat")) markRead(S.user.uid, "user"); })}
  ${chatForm()}</div>`;
}
export const afterChat = () => { toEnd(); if (S.user && +S.chatMeta?.unreadUser > 0) markRead(S.user.uid, "user"); };

// ===== Akun & pengaturan =====
const loginCard = (t, d) => `<div class="card" style="max-width:460px;margin:30px auto;text-align:center;display:grid;gap:12px;justify-items:center"><img src="./tubi-icon.png" style="width:72px;border-radius:20px" alt=""><h2>${t}</h2><p class="muted">${d}</p><button class="btn pri" data-act="login">Masuk dengan Google</button></div>`;
const themeBox = () => { const t = themePref(); return `<div class="seg">${[["auto", "Otomatis"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `<button class="${t === k ? "on" : ""}" data-act="theme" data-t="${k}">${l}</button>`).join("")}</div>`; };
const prefsCard = () => `<div class="card col"><h3>Pengaturan tampilan</h3><div><div class="lbl">Tema</div>${themeBox()}</div>
  <label class="chk"><input type="checkbox" data-change="sound" ${ls.get("sound", true) !== false ? "checked" : ""}> Suara notifikasi</label>
  <button class="btn sm" data-act="clearlocal">Hapus data lokal (keranjang & favorit)</button>
  <button class="btn sm ghost only-kb only-d" data-act="pintasan">${svg("keyboard", 15)} Pintasan keyboard <kbd>?</kbd></button>
  <div class="row" style="border-top:1px solid var(--line);padding-top:12px"><span class="sp muted sm">Versi aplikasi <b>${APP_VERSION}</b></span><button class="btn sm" data-act="cekupdate">${svg("download", 15)} Cek pembaruan</button></div></div>`;
actions.cekupdate = async () => { const u = await cekUpdate(true); if (!u) toast(window.Capacitor?.isNativePlatform?.() ? `Tubi ${APP_VERSION} sudah versi terbaru.` : "Versi web selalu yang terbaru."); };
export function account() {
  if (!S.user) return `<div class="two eq">${loginCard("Masuk ke Tubi", "Simpan alamat, pantau pesanan, chat admin, dan beri ulasan.")}${prefsCard()}</div>`;
  const p = S.profile;
  const cnt = k => S.orders.filter(o => statusOf(o.status) === k).length;
  return `<div class="two eq"><div class="col"><div class="card col prof"><div class="row"><span class="av">${p.photoURL ? `<img src="${esc(p.photoURL)}" alt="">` : initial(p.displayName)}</span><div style="min-width:0"><b style="font:700 19px var(--fd)">${esc(p.displayName)}</b><div class="muted sm">${esc(S.user.email || "")}</div>${S.isAdmin ? `<span class="chip">${isMain(S.user) ? "Admin utama" : "Admin"}</span>` : ""}</div><span class="sp"></span><button type="button" class="icon-btn prof-tema" data-act="temapick" aria-label="Ganti tema">${svg(document.body.classList.contains("dark") ? "moon" : "sun")}</button></div>
    ${S.isAdmin ? `<a class="btn yel" href="#/admin">${svg("grid", 18)} Buka dashboard admin</a>` : ""}</div>
    <div class="card"><div class="row" style="margin-bottom:10px"><b>Pesanan saya</b><span class="sp"></span><a class="xs muted" href="#/orders">Lihat riwayat ›</a></div>
    <div class="ostat">${[["menunggu", "receipt", "Menunggu"], ["diproses", "chef", "Diproses"], ["siap", "bike", "Siap"], ["selesai", "star", "Selesai"]].map(([k, e, l]) => `<a href="#/orders" data-act="ostgo" data-k="${k}"><i>${svg(e, 20)}</i>${l}${cnt(k) && k !== "selesai" ? `<span class="badge">${cnt(k)}</span>` : ""}</a>`).join("")}</div></div>
    <div class="card"><form class="col" data-form="profile"><h3>Data pengantaran</h3><label>Nama penerima<input name="name" value="${esc(p.recipientName || p.displayName || "")}"></label><label>No. WhatsApp<input name="phone" inputmode="tel" value="${esc(p.phone || "")}"></label><label>Alamat<textarea name="address" placeholder="Alamat lengkap">${esc(p.address || "")}</textarea></label>
    <div class="row wrap"><button type="button" class="btn" data-act="proloc">${svg("pin", 18)} ${p.location?.lat ? "Ubah titik lokasi" : "Pilih titik lokasi"}</button>${p.location?.lat ? `<span class="chip st-selesai">✓ Titik tersimpan</span>` : ""}</div><button class="btn pri" type="submit">Simpan</button></form></div>
</div>
  <div class="col">${prefsCard()}
    <form class="card col" data-form="bug"><h3>Laporkan masalah</h3><p class="muted sm" style="margin:-6px 0 0">Ada yang tidak berjalan? Ceritakan, tim Tubi akan memeriksanya.</p><label>Jenis<select name="type"><option>Pesanan</option><option>Pembayaran</option><option>Login</option><option>Produk</option><option>Lokasi / peta</option><option>Lainnya</option></select></label><label>Deskripsi<textarea name="description" required placeholder="Apa yang terjadi?"></textarea></label><label>Tangkapan layar <span class="hint">(opsional)</span>${dropzone("shot", "", "Unggah tangkapan layar")}</label><button class="btn pri" type="submit">${svg("send", 17)} Kirim laporan</button></form></div></div>
  <div class="akun-bawah"><button type="button" class="akun-keluar" data-act="logout">${svg("logout", 18)} Keluar dari akun</button>
    <button type="button" class="akun-hapus" data-act="delacct">Hapus akun saya</button></div>`;
}
forms.profile = async (f, fd) => {
  const d = { recipientName: String(fd.get("name")).trim(), phone: String(fd.get("phone")).trim(), address: String(fd.get("address")).trim() };
  await F.setDoc(F.doc(db, "users", S.user.uid), d, { merge: true }); Object.assign(S.profile, d); toast("Profil disimpan.");
};
forms.bug = async (f, fd) => {
  const sh = fd.get("shot"); const shot = sh && sh.size ? await compressImage(sh, 900) : "";
  await F.addDoc(F.collection(db, "bugReports"), { userId: S.user.uid, email: S.user.email || "", type: fd.get("type"), description: String(fd.get("description")).trim(), orderId: "", screenshot: shot, status: "baru", createdAt: F.serverTimestamp() });
  f.reset(); $$(".drop-pv", f).forEach(x => x.innerHTML = svg("image", 24)); toast("Laporan terkirim ke admin. Terima kasih!");
};
let PL = { loc: null, addr: "" };
actions.proloc = () => {
  PL = { loc: S.profile.location || null, addr: S.profile.address || "" };
  openOverlay(`<div class="sheet-head"><h3>Titik lokasi default</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>${pickerHtml("pf")}
    <label style="margin-top:12px">Alamat<textarea id="pfaddr" data-input="addrtype" placeholder="Alamat lengkap">${esc(PL.addr)}</textarea></label><button class="btn pri full" style="margin-top:12px" data-act="prosave">Simpan lokasi</button>`, "wide");
  mountLocation("pf", PL.loc, (loc, addr) => { PL.loc = loc; const a = $("#pfaddr"); if (addr && a && (!a.value.trim() || a.dataset.auto === "1")) { a.value = addr; a.dataset.auto = "1"; } });
};
actions.prosave = async () => {
  if (!PL.loc) throw new Error("Tandai titik di peta dulu."); const addr = ($("#pfaddr").value || "").trim();
  const d = { location: PL.loc, ...(addr ? { address: addr } : {}) }; await F.setDoc(F.doc(db, "users", S.user.uid), d, { merge: true });
  Object.assign(S.profile, d); closeOverlay(); toast("Lokasi disimpan ✓"); if (location.hash.slice(1) === "/account") { $("#view").innerHTML = account(); }
};
actions.settings = () => openOverlay(`<div class="sheet-head"><h3>Pengaturan</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div><div class="col"><div><div class="lbl">Tema tampilan</div>${themeBox()}</div>
  <label class="chk"><input type="checkbox" data-change="sound" ${ls.get("sound", true) !== false ? "checked" : ""}> Suara notifikasi</label><button class="btn" data-act="clearlocal">Hapus data lokal (keranjang & favorit)</button>
  ${S.user ? "" : `<button class="btn pri" data-act="login">Masuk dengan Google</button>`}</div>`);
// Tombol tema di kartu profil: khusus memilih tema, sekali ketuk langsung berlaku lalu tertutup
const TEMA = [["auto", "sun", "Otomatis", "Ikut pengaturan HP"], ["light", "sun", "Terang", "Latar krem cerah"], ["dark", "moon", "Gelap", "Nyaman di malam hari"]];
actions.temapick = () => { const t = themePref(); openOverlay(`<div class="sheet-head"><h3>Tema tampilan</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="tema-list">${TEMA.map(([k, ic, l, d]) => `<button type="button" class="${t === k ? "on" : ""}" data-act="temaset" data-t="${k}"><i>${svg(ic, 20)}</i><span><b>${l}</b><small>${d}</small></span>${t === k ? svg("check", 18) : ""}</button>`).join("")}</div>`); };
actions.temaset = el => { setTheme(el.dataset.t); closeOverlay(); const b = $(".prof-tema"); if (b) b.innerHTML = svg(document.body.classList.contains("dark") ? "moon" : "sun"); toast("Tema: " + el.querySelector("b").textContent); };
actions.theme = el => { setTheme(el.dataset.t); $$(".seg").forEach(s => $$("button", s).forEach(b => b.classList.toggle("on", b.dataset.t === el.dataset.t))); };
actions.themetoggle = () => setTheme(document.body.classList.contains("dark") ? "light" : "dark");
actions.sound = t => { ls.set("sound", t.checked); toast(t.checked ? "Suara aktif" : "Suara dimatikan"); };
actions.clearlocal = async () => { if (await confirmBox("Hapus data lokal?", "Keranjang dan daftar favorit di perangkat ini akan dikosongkan.", "Hapus")) { S.cart = []; S.favs = []; saveCart(); saveFavs(); emit("cart"); repaint("feed"); toast("Data lokal dihapus."); } };
actions.delacct = async () => {
  if (isMain(S.user)) throw new Error("Akun admin utama tidak bisa dihapus dari aplikasi.");
  if (!await ask({ title: "Hapus akun secara permanen?", text: "Profil, chat, dan ulasanmu akan dihapus. Kamu akan diminta login Google sekali lagi untuk konfirmasi.\nTindakan ini tidak bisa dibatalkan.", ok: "Lanjut hapus akun", danger: true })) return;
  const u = auth.currentUser, uid = u.uid;
  try { await A.reauthenticateWithPopup(u, new A.GoogleAuthProvider()); } catch (e) { throw new Error("Konfirmasi login dibatalkan. Akun tidak dihapus."); }
  try {
    const ms = await F.getDocs(F.collection(db, "chats", uid, "messages")); for (const d of ms.docs) await F.deleteDoc(d.ref);
    await F.deleteDoc(F.doc(db, "chats", uid)).catch(() => {});
    for (const r of S.reviews.filter(x => x.userId === uid)) await F.deleteDoc(F.doc(db, "productReviews", r.id)).catch(() => {});
    await F.deleteDoc(F.doc(db, "users", uid)).catch(() => {});
    await A.deleteUser(u);
  } catch (e) { console.error(e); throw new Error("Akun belum terhapus sepenuhnya: " + (e.code || e.message)); }
  S.cart = []; saveCart(); go("/", true); toast("Akun dihapus. Sampai jumpa!");
};

// ===== Halaman pembayaran (setelah pesanan transfer / QRIS dibuat) =====
actions.paynow = el => go("/pay/" + el.dataset.id);
actions.ostgo = el => { V.ost = el.dataset.k; go("/orders"); };
const payMethodOf = o => { const k = o.payment?.viaKey || ""; if (k === "qris") return { name: "QRIS", qris: true }; const id = k.replace(/^m:/, ""); return payMethods().find(m => m.id === id) || payMethods().find(m => m.name === o.payment?.via) || null; };
// Kartu cara bayar: e-wallet / bank ("Bayar sekarang" = salin nomor + buka aplikasinya) atau QRIS (rapi + bisa diperbesar)
const namaMetode = (m, p) => p && p.key !== "lain" ? p.name : (m?.name || "E-wallet");
const howToPay = (o, m) => {
  if (m?.qris) return S.settings.payQris ? `<div class="qris-card">
    <div class="qris-head"><span class="qris-logo">QRIS</span><span><b>Scan untuk bayar</b><small>Bisa pakai DANA, GoPay, OVO, ShopeePay, atau m-banking apa pun</small></span></div>
    <button type="button" class="qris-img" data-act="qrisbesar" aria-label="Perbesar QRIS"><img src="${esc(S.settings.payQris)}" alt="Kode QRIS Tubi"><span class="qris-zoom">${svg("search", 14)} Ketuk untuk perbesar</span></button>
    <div class="qris-amt"><small>Total yang dibayar</small><b>${rupiah(o.total)}</b></div>
    <div class="qris-act"><a class="btn" href="${esc(S.settings.payQris)}" download="QRIS-Tubi-${o.id.slice(0, 6).toUpperCase()}.jpg">${svg("download", 16)} Simpan QRIS</a><button class="btn" data-act="copy" data-t="${Math.round(o.total)}">${svg("note", 16)} Salin nominal</button></div>
    <ol class="pay-steps"><li>Simpan atau screenshot QRIS di atas.</li><li>Buka aplikasi bank / e-wallet, pilih <b>Scan / Bayar QRIS</b>, lalu pilih gambar QRIS dari galeri.</li><li>Masukkan nominal <b>${rupiah(o.total)}</b>, bayar, lalu unggah bukti di bawah.</li></ol></div>` : `<div class="alert">QRIS belum tersedia. Pilih metode lain atau hubungi admin.</div>`;
  if (!m) return `<div class="alert">Detail pembayaran tidak ditemukan. Ganti metode pembayaran atau hubungi admin lewat chat.</div>`;
  const p = provOf(m), no = nomorOf(m), an = atasNamaOf(m), nama = namaMetode(m, p), bank = p?.type === "bank";
  return `<div class="acc-card" style="--pv:${p?.color || "#806f68"}">${badge(m, 52)}<div class="sp"><small>${bank ? "Transfer ke rekening" : "Kirim ke"} ${esc(nama)}</small><b class="acc-no">${esc(no || m.detail || "-")}</b>${an ? `<span>a.n. ${esc(an)}</span>` : ""}</div></div>
    <div class="acc-act">${no ? `<button class="btn pri paynow" data-act="paynow" data-no="${esc(no)}" data-pkg="${esc(p?.pkg || "")}" data-nama="${esc(nama)}" data-app="${esc(p?.pkg ? appName(p) : "")}" data-total="${esc(rupiah(o.total))}" data-an="${esc(an)}">${svg("send", 17)} Bayar sekarang</button>` : ""}${m.link ? `<a class="btn" target="_blank" rel="noopener" href="${esc(m.link)}">${svg("link", 16)} Halaman pembayaran</a>` : ""}</div>
    <ol class="pay-steps"><li>Tekan <b>Bayar sekarang</b>. Nomor ${esc(nama)} langsung tersalin${p?.pkg ? ` dan aplikasi ${esc(appName(p))} terbuka` : ""}.</li><li>Kirim tepat <b>${rupiah(o.total)}</b> ke nomor itu.</li><li>Kembali ke Tubi, lalu unggah foto bukti di bawah.</li></ol>`;
};
// Bayar sekarang: nomor langsung tersalin, lalu konfirmasi "lanjut bayar" sebelum membuka aplikasinya
actions.paynow = el => { bayarSekarang(el.dataset); };   // tidak ditunggu: tombol tidak berputar selama dialog terbuka
async function bayarSekarang(d) {
  const ok = await salin(d.no);
  const lanjut = await ask({ title: ok ? "Nomor sudah tersalin" : "Salin nomornya dulu", ok: d.pkg ? `Lanjut bayar di ${d.app}` : "Lanjut bayar", cancel: "Batal",
    text: `${d.nama} ${d.no}${d.an ? " a.n. " + d.an : ""}\nTotal yang dibayar: ${d.total}\n\n${d.pkg ? `Aplikasi ${d.app} akan terbuka. Tempel nomornya, kirim tepat ${d.total}, lalu kembali ke Tubi untuk unggah bukti.` : `Buka aplikasi ${d.nama} kamu, tempel nomornya, lalu kirim tepat ${d.total}.`}` });
  if (lanjut && d.pkg) bukaAplikasi(d.pkg);
}
actions.qrisbesar = () => openOverlay(`<div class="sheet-head"><h3>QRIS Tubi</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="qris-full"><img src="${esc(S.settings.payQris)}" alt="Kode QRIS Tubi"></div><a class="btn pri full" href="${esc(S.settings.payQris)}" download="QRIS-Tubi.jpg">${svg("download", 16)} Simpan QRIS</a>`);
const payBody = id => {
  const o = S.orders.find(x => x.id === id);
  if (!o) return `<div class="empty">${S.user ? "Memuat pesanan…" : "Masuk untuk melihat pembayaran."}</div>`;
  const m = payMethodOf(o), ps = o.payment?.status, st = statusOf(o.status), kode = "#" + esc(o.id.slice(0, 6).toUpperCase());
  const head = (ic, cls, judul, isi) => `<div class="pay-hero ${cls}"><i>${svg(ic, 34)}</i><b>${judul}</b><span>${isi}</span></div>`;
  const aksi = `<div class="row wrap"><a class="btn sp" href="#/orders">${svg("box", 16)} Lihat pesanan</a><a class="btn sp" href="#/chat">${svg("chat", 16)} Chat admin</a></div>`;
  if (ps === "paid") return `<div class="card col pay-card">${head("check", "ok", "Pembayaran diterima. Terima kasih!", `Pembayaran ${rupiah(o.total)} untuk pesanan ${kode} sudah dikonfirmasi admin. Pesananmu segera disiapkan.`)}${aksi}</div>`;
  if (st === "dibatalkan") return `<div class="card col pay-card">${head("x", "bad", "Pesanan dibatalkan", `Pesanan ${kode} sudah dibatalkan${o.payment?.note ? ": " + esc(o.payment.note) : "."} Bila sudah terlanjur membayar, hubungi admin lewat chat.`)}${aksi}</div>`;
  if (o.payment?.method !== "transfer") return `<div class="card col pay-card">${head("cash", "ok", "Bayar di tempat (COD)", `Siapkan uang tunai ${rupiah(o.total)} saat pesanan tiba.`)}${aksi}</div>`;
  const status = ps === "issue" ? head("alert", "warn", "Ada kendala pembayaran", esc(o.payment?.note || "Admin belum bisa memastikan pembayaranmu. Periksa lagi lalu unggah ulang bukti, atau chat admin."))
    : o.paymentProof ? head("clock", "wait", "Bukti terkirim, menunggu dicek admin", "Biasanya hanya beberapa menit. Kamu akan dapat notifikasi saat pembayaran diterima.")
    : `<div class="pay-due"><div><small>Pesanan ${kode}</small><b class="pay-total">${rupiah(o.total)}</b></div><span class="chip st-menunggu">Menunggu pembayaran</span></div>`;
  return `<div class="card col pay-card">${status}
    ${o.paymentProof && ps !== "issue" ? "" : `<div class="pay-via"><span>Bayar lewat <b>${esc(m?.qris ? "QRIS" : m ? namaMetode(m, provOf(m)) : (o.payment?.via || "Transfer"))}</b></span>${st === "menunggu" ? `<button class="btn sm ghost" data-act="paychange" data-id="${o.id}">${svg("edit", 15)} Ganti metode</button>` : ""}</div>${howToPay(o, m)}`}
    <form class="col proof-box" data-form="proof" data-id="${o.id}"><div class="lbl" style="margin:0">Bukti pembayaran</div>${o.paymentProof ? `<img class="proof-img" src="${esc(o.paymentProof)}" alt="Bukti pembayaran">` : ""}${dropzone("proof", "", o.paymentProof ? "Ganti foto bukti" : "Unggah foto bukti bayar")}<button class="btn pri" type="submit">${o.paymentProof ? "Kirim ulang bukti" : "Kirim bukti pembayaran"}</button></form>
    ${aksi}</div>`;
};
actions.payapp = async el => { const ok = await salin(el.dataset.no); toast(ok ? "Nomor tujuan disalin. Membuka aplikasi…" : "Nomor belum tersalin, salin manual ya."); setTimeout(() => bukaAplikasi(el.dataset.pkg), 450); };
actions.paychange = el => {
  const o = S.orders.find(x => x.id === el.dataset.id); if (!o) return;
  openOverlay(`<div class="sheet-head"><h3>Ganti metode pembayaran</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="paybox">${payOptions().map(x => `<button class="pay ${o.payment?.viaKey === x.key || (x.kind === "cod" && o.payment?.method === "cod") ? "on" : ""}" data-act="paypick" data-id="${o.id}" data-k="${esc(x.key)}">${x.method && !x.method.qris ? badge(x.method, 40) : `<span class="pay-ic">${svg(x.kind === "cod" ? "cash" : "qr", 22)}</span>`}<span><b>${esc(x.name)}</b><small class="muted">${esc(x.method && !x.method.qris ? nomorOf(x.method) : x.hint)}</small></span></button>`).join("")}</div>`);
};
actions.paypick = async el => {
  const x = payOptions().find(y => y.key === el.dataset.k), o = S.orders.find(y => y.id === el.dataset.id); if (!x || !o) return;
  await F.updateDoc(F.doc(db, "orders", o.id), { payment: { method: x.kind, status: "unpaid", via: x.name, viaKey: x.key }, updatedAt: F.serverTimestamp() });
  closeOverlay(); if (x.kind === "cod") go("/orders");
};
export function pay() {
  const id = (location.hash.slice(1).split("/")[2] || "");
  if (!S.user) return loginCard("Masuk untuk melihat pembayaran", "Pembayaran terkait akunmu.");
  return `${live("paypg", ["orders"], () => payBody(id))}`;
}
