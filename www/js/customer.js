import { db, F, auth, A } from "./firebase.js";
import { S, emit, signIn, signOutNow, avail, ratingOf, reviewsOf, cartCount, calc, saveCart, saveFavs, statusOf, STATUS_LABEL, isMain, payMethods, payOptions } from "./data.js";
import { actions, forms, live, go, openOverlay, closeOverlay, repaint } from "./core.js";
import { $, $$, esc, rupiah, svg, stars, toast, timeText, initial, normPhone, ls, compressImage } from "./util.js";
import { msgsHtml, chatForm, toEnd, markRead } from "./chat.js";
import { confirmBox, ask, themePref, setTheme, dropzone } from "./ui.js";
import { mountLocation, pickerHtml, mapsDir, mapsView } from "./map.js";

const V = { q: "", cat: "Semua", fav: false, sort: "rec", voucher: "", loc: null, pay: "cod" };
export const img = p => {
  let s = String(p?.image || "").trim(); if (s.startsWith("assets/")) s = "./" + s;
  return /^(data:image|https?:\/\/|\.\/|\/)/.test(s) ? s : "";
};
export const imgStyle = p => { const x = Number.isFinite(+p?.imageX) && p?.imageX !== undefined ? +p.imageX : 50, y = Number.isFinite(+p?.imageY) && p?.imageY !== undefined ? +p.imageY : 50; return `style="object-fit:${p?.imageFit === "contain" ? "contain" : "cover"};object-position:${x}% ${y}%"`; };
const pic = p => img(p) ? `<img src="${esc(img(p))}" alt="${esc(p.name)}" loading="lazy" ${imgStyle(p)}>` : "🍢";
const prodOf = id => S.products.find(p => p.id === id);
const thumb = id => { const p = prodOf(id); return p && img(p) ? `<img src="${esc(img(p))}" alt="">` : "🍢"; };
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
  return `<header class="c-top"><div class="in">
    <a class="logo" href="#/"><img src="./tubi-icon.png" alt="">tubi</a>
    <nav class="c-links">${live("cnav-d", ["route", "chatMeta"], () => navLinks(false))}</nav>
    <div class="c-search">${svg("search")}<input type="search" placeholder="Cari menu favoritmu…" data-input="search" id="q" value="${esc(V.q)}"></div>
    <span class="sp only-m"></span>
    <div class="c-actions">
      <button class="icon-btn" data-act="settings" aria-label="Pengaturan">${svg("cog")}</button>
      <button class="icon-btn" data-act="cart" aria-label="Keranjang">${svg("bag")}${live("cbadge", ["cart"], () => `<span class="badge ${cartCount() ? "" : "z"}">${cartCount()}</span>`)}</button>
      ${live("cacct", ["auth", "profile"], () => S.user ? `${S.isAdmin ? `<a class="btn sm" href="#/admin">${svg("grid", 16)} Admin</a>` : ""}<a class="av" href="#/account" title="Akun">${S.profile.photoURL ? `<img src="${esc(S.profile.photoURL)}" alt="">` : initial(S.profile.displayName)}</a>` : `<button class="btn pri sm" data-act="login">${svg("user", 16)} Masuk</button>`)}
    </div>
  </div></header>
  <main id="view" class="c-main"></main>
  ${live("cbar", ["cart", "route"], cartBar)}
  <nav class="c-nav">${live("cnav-m", ["route", "chatMeta"], () => navLinks(true))}</nav>`;
}
const NAV = [["/", "home", "Beranda"], ["/orders", "bag", "Pesanan"], ["/chat", "chat", "Chat"], ["/account", "user", "Akun"]];
function navLinks(icons) {
  const p = location.hash.slice(1) || "/", unread = +S.chatMeta?.unreadUser || 0;
  return NAV.map(([h, ic, lb]) => `<a href="#${h}" class="${p === h ? "on" : ""}">${icons ? svg(ic, 22) : ""}${lb}${h === "/chat" && unread ? `<span class="badge">${unread}</span>` : ""}</a>`).join("");
}
function cartBar() {
  const n = cartCount(), p = location.hash.slice(1) || "/";
  if (!n || p === "/checkout" || p === "/chat" || p.startsWith("/pay/")) return "";
  return `<div class="cartbar" data-act="cart" role="button">${svg("bag", 22)}<b>${n} item</b><span class="sp"></span><b>${rupiah(calc().subtotal)}</b><span>Lihat ›</span></div>`;
}

// ===== Beranda =====
const filtered = () => {
  const q = V.q.trim().toLowerCase();
  let l = S.products.filter(p => (V.cat === "Semua" || (p.category || "Lainnya") === V.cat) && (!V.fav || S.favs.includes(p.id)) &&
    (!q || `${p.name} ${p.category} ${(p.attributes || []).join(" ")} ${p.description || ""}`.toLowerCase().includes(q)));
  if (V.sort === "low") l.sort((a, b) => a.price - b.price); else if (V.sort === "high") l.sort((a, b) => b.price - a.price); else if (V.sort === "rate") l.sort((a, b) => ratingOf(b) - ratingOf(a));
  return l;
};
const card = p => {
  const rs = reviewsOf(p.id).length, on = S.favs.includes(p.id), ok = avail(p);
  return `<article class="prod"><button class="fav ${on ? "on" : ""}" data-act="fav" data-id="${p.id}" aria-label="Favorit">${svg("heart", 17)}</button>
    <div class="ph" data-act="detail" data-id="${p.id}">${pic(p)}</div>${ok ? "" : `<div class="sold">HABIS</div>`}
    <div class="bd"><h3 data-act="detail" data-id="${p.id}">${esc(p.name)}</h3>
    <div class="xs muted">${stars(ratingOf(p))} ${ratingOf(p).toFixed(1)}${rs ? ` (${rs})` : ""} · ${esc(p.category || "")}</div>
    <div class="pr"><b>${rupiah(p.price)}</b><button class="add" data-act="add" data-id="${p.id}" ${ok ? "" : "disabled"} aria-label="Tambah ke keranjang">${svg("plus", 20)}</button></div></div></article>`;
};
const grid = () => {
  if (S.errors.products) return `<div class="alert">Menu belum bisa dimuat (${esc(S.errors.products)}). Pastikan <code>firestore.rules</code> sudah dipublish.</div>`;
  const l = filtered();
  if (!l.length) return `<div class="empty">${S.products.length ? "Menu tidak ditemukan. Coba kata kunci lain." : "Menu belum tersedia. Admin sedang menyiapkannya 🍢"}</div>`;
  return `<div class="prods">${l.map(card).join("")}</div>`;
};
const hero = () => {
  const st = S.settings, tags = String(st.heroTags ?? "Fresh setiap hari, Antar cepat, Harga pelajar").split(",").map(x => x.trim()).filter(Boolean);
  const title = String(st.heroTitle || "Lapar?\nPesan Tubi."), text = st.heroText || "Roti kukus, topokki, cilok, dan jajanan favorit — langsung dari HP, status pesanan terlihat real-time.";
  return `${st.open === false ? `<div class="alert" style="margin-bottom:12px">Toko sedang tutup. Kamu tetap bisa lihat menu; pesanan dibuka lagi saat toko buka${st.hours ? " (" + esc(st.hours) + ")" : ""}.</div>` : ""}
  <section class="hero"><div class="tags">${tags.map(t => `<span>${esc(t)}</span>`).join("")}</div><h1>${esc(title).replace(/\n/g, "<br>")}</h1><p>${esc(text)}</p><img src="${esc(st.heroImage || "./assets/menu-poster.jpg")}" alt="" onerror="this.remove()"></section>`;
};
export function home() {
  return `${live("hero", ["settings"], hero)}
  <div class="m-search">${svg("search")}<input type="search" placeholder="Cari menu favoritmu…" data-input="search" value="${esc(V.q)}"></div>
  ${live("cats", ["products"], () => `<div class="cats-wrap"><div class="cats" aria-label="Filter kategori menu">${cats().map(c => `<button class="cat ${V.cat === c ? "on" : ""}" data-act="cat" data-c="${esc(c)}">${esc(c)}</button>`).join("")}<button class="cat cat-fav ${V.fav ? "on" : ""}" data-act="favonly">♥ Favorit</button></div></div>`)}
  <div class="row wrap" style="margin-top:10px"><h2>Menu pilihan</h2><span class="sp"></span><select style="width:auto" data-change="sort"><option value="rec">Rekomendasi</option><option value="rate" ${V.sort === "rate" ? "selected" : ""}>Rating tertinggi</option><option value="low" ${V.sort === "low" ? "selected" : ""}>Termurah</option><option value="high" ${V.sort === "high" ? "selected" : ""}>Termahal</option></select></div>
  ${live("grid", ["products", "reviews", "errors"], grid)}`;
}
actions.search = t => { V.q = t.value; $$('[data-input="search"]').forEach(i => { if (i !== t) i.value = V.q; }); repaint("grid"); };
actions.sort = t => { V.sort = t.value; repaint("grid"); };
actions.cat = el => { V.cat = el.dataset.c; repaint("cats"); repaint("grid"); };
actions.favonly = () => { V.fav = !V.fav; repaint("cats"); repaint("grid"); };
actions.fav = el => { const id = el.dataset.id, i = S.favs.indexOf(id); i < 0 ? S.favs.push(id) : S.favs.splice(i, 1); saveFavs(); repaint("grid"); };
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
  openOverlay(`<div class="sheet-head"><h3>${esc(p.name)}</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
  <div class="pd"><div class="big">${pic(p)}</div>
  <div class="row wrap"><b style="font-size:22px;color:var(--red)">${rupiah(p.price)}</b><span class="chip">${esc(p.category || "")}</span>${avail(p) ? "" : `<span class="chip st-dibatalkan">Habis</span>`}</div>
  <p class="muted">${esc(p.description || "")}</p>
  ${(p.attributes || []).length ? `<div class="row wrap">${p.attributes.map(a => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : ""}
  <div class="buyrow"><div class="qty"><button data-act="dq" data-d="-1">${svg("minus", 16)}</button><b id="dqn">1</b><button data-act="dq" data-d="1">${svg("plus", 16)}</button></div>
  <button class="btn" data-act="addn" data-id="${p.id}" ${avail(p) ? "" : "disabled"}>${svg("bag", 18)} Keranjang</button><button class="btn pri" data-act="buy" data-id="${p.id}" ${avail(p) ? "" : "disabled"}>Beli sekarang</button></div>
  <div><h3>Ulasan & komentar</h3>${live("rv", ["reviews", "auth"], () => reviewBox(p))}</div></div>`, "wide");
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
  return S.cart.map(x => `<div class="line"><div class="thumb">${thumb(x.id)}</div><div style="flex:1;min-width:0"><b>${esc(x.name)}</b><div class="muted sm">${rupiah(x.price)} × ${x.qty} = <b>${rupiah(x.price * x.qty)}</b></div></div>
    <div class="qty"><button data-act="cq" data-id="${x.id}" data-d="-1" aria-label="Kurangi">${svg("minus", 16)}</button><b>${x.qty}</b><button data-act="cq" data-id="${x.id}" data-d="1" aria-label="Tambah">${svg("plus", 16)}</button></div>
    <button class="icon-btn sm-ic" data-act="crm" data-id="${x.id}" aria-label="Hapus dari keranjang">${svg("trash", 17)}</button></div>`).join("")
    + `<div class="sum" style="margin-top:12px"><div><span class="muted">Subtotal (${cartCount()} item)</span><b>${rupiah(c.subtotal)}</b></div></div>
    <button class="btn pri full" style="margin-top:14px" data-act="tocheckout">Lanjut checkout</button><button class="btn ghost danger full" style="margin-top:6px" data-act="cclear">Kosongkan keranjang</button>`;
}
actions.cq = el => { const x = S.cart.find(c => c.id === el.dataset.id); if (!x) return; x.qty += +el.dataset.d; if (x.qty <= 0) S.cart.splice(S.cart.indexOf(x), 1); mutCart(); };
actions.crm = el => { S.cart = S.cart.filter(c => c.id !== el.dataset.id); mutCart(); };
actions.cclear = async () => { if (await confirmBox("Kosongkan keranjang?", "Semua item di keranjang akan dihapus.", "Kosongkan")) { S.cart = []; mutCart(); } };
actions.tocheckout = () => { closeOverlay(); go("/checkout"); };

// ===== Checkout =====


export function checkout() {
  if (!S.cart.length) return `<div class="empty">Keranjang kosong. <a class="btn pri" href="#/" style="margin-left:8px">Pilih menu</a></div>`;
  const p = S.profile, opts = payOptions(); if (!opts.some(o => o.key === V.pay)) V.pay = opts[0].key;
  return `<h2 style="margin-bottom:14px">Checkout</h2><div class="two">
  <form class="card col" data-form="order"><h3>Data pengantaran</h3>
    ${S.user ? "" : `<div class="alert">Masuk dengan Google dulu untuk membuat pesanan. <button type="button" class="btn sm pri" data-act="login">Masuk</button></div>`}
    <div class="grid2"><label>Nama penerima<input name="name" required value="${esc(p.recipientName || p.displayName || "")}"></label><label>No. WhatsApp<input name="phone" required inputmode="tel" placeholder="08xxxxxxxxxx" value="${esc(p.phone || "")}"></label></div>
    <div><div class="lbl">Titik lokasi pengantaran</div>${pickerHtml("co")}</div>
    <label>Alamat lengkap <span class="hint">(terisi otomatis dari titik peta — tambahkan patokan / nomor rumah)</span><textarea name="address" id="coaddr" data-input="addrtype" placeholder="Jalan, nomor rumah, patokan…">${esc(p.address || "")}</textarea></label>
    <label>Catatan <span class="hint">(opsional)</span><input name="note" placeholder="Misal: pedas level 2"></label>
    <div><div class="lbl">Metode pembayaran</div><div class="paybox">${opts.map(o => `<label class="pay"><input type="radio" name="pay" value="${esc(o.key)}" data-change="paychg" ${V.pay === o.key ? "checked" : ""}><span class="pay-ic">${o.kind === "cod" ? "💵" : o.key === "qris" ? "▦" : "🏦"}</span><span><b>${esc(o.name)}</b><small class="muted">${esc(o.hint)}</small></span></label>`).join("")}</div>
    <div id="paynote" class="alert ok ${opts.find(o => o.key === V.pay)?.kind === "transfer" ? "" : "hidden"}" style="margin-top:10px">Setelah menekan <b>Buat pesanan</b>, kamu akan diarahkan ke halaman pembayaran (rekening / e-wallet / QRIS) untuk menyelesaikan pembayaran dan mengunggah bukti.</div></div>

    <button class="btn pri full" type="submit">Buat pesanan</button></form>
  <div class="card"><h3>Ringkasan</h3>${live("sum", ["cart", "settings", "products"], sumHtml)}
    <div class="row" style="margin-top:14px"><input id="vch" placeholder="Kode voucher" value="${esc(V.voucher)}" style="text-transform:uppercase"><button type="button" class="btn" data-act="voucher">Pakai</button></div></div></div>`;
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
actions.voucher = () => { V.voucher = ($("#vch").value || "").trim().toUpperCase(); const c = calc(V.voucher); toast(c.vOk ? "Voucher dipakai 🎉" : "Kode voucher tidak valid.", c.vOk ? "" : "err"); repaint("sum"); };
actions.copy = async el => { try { await navigator.clipboard.writeText(el.dataset.t); toast("Disalin ✓"); } catch { toast("Tidak bisa menyalin otomatis.", "err"); } };
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
  S.cart = []; V.voucher = ""; mutCart(); toast("Pesanan terkirim! Admin langsung menerimanya 🎉"); go(method === "transfer" ? "/pay/" + ref.id : "/orders");
};

// ===== Pesanan =====
const FLOW = ["menunggu", "diproses", "siap", "selesai"];
const payChip = o => { const m = o.payment?.method; if (!m) return ""; const via = o.payment?.via ? ` · ${esc(o.payment.via)}` : ""; return m === "cod" ? `<span class="chip">COD</span>` : o.payment?.status === "paid" ? `<span class="chip st-selesai">Lunas${via}</span>` : `<span class="chip st-menunggu">Belum dibayar${via}</span>`; };
const orderCard = o => {
  const st = statusOf(o.status), idx = FLOW.indexOf(st), needProof = o.payment?.method === "transfer" && o.payment?.status !== "paid" && st !== "dibatalkan";
  return `<div class="card ord"><div class="ord-top"><div><b>#${esc(o.id.slice(0, 6).toUpperCase())}</b><div class="muted sm">${timeText(o.createdAt)}</div></div><span class="chip st-${st}">${STATUS_LABEL[st]}</span></div>
  ${st === "dibatalkan" ? "" : `<div class="steps">${FLOW.map((_, i) => `<i class="${i <= idx ? "on" : ""}"></i>`).join("")}</div>`}
  <div class="items">${(o.items || []).map(i => `<div class="it"><span class="thumb xs">${thumb(i.id)}</span><span class="sp">${i.qty}× ${esc(i.name)}</span><span>${rupiah(i.qty * i.price)}</span></div>`).join("")}</div>
  <div class="row wrap">${payChip(o)}${o.location?.lat ? `<a class="chip" target="_blank" rel="noopener" href="${esc(mapsView(o))}">📍 Lokasi terkirim</a>` : ""}</div>
  <div class="row wrap"><b>Total ${rupiah(o.total)}</b><span class="sp"></span>
  ${needProof ? `<button class="btn sm pri" data-act="paynow" data-id="${o.id}">${o.paymentProof ? "Lihat pembayaran" : "Bayar sekarang"}</button>` : ""}
  ${st === "menunggu" ? `<button class="btn sm danger" data-act="cancel" data-id="${o.id}">Batalkan</button>` : ""}
  ${st === "selesai" ? (o.review ? `<span class="chip">★ ${o.review.rating}</span>` : `<button class="btn sm" data-act="rate" data-id="${o.id}">Beri ulasan</button>`) : ""}
  <button class="btn sm" data-act="reorder" data-id="${o.id}">Pesan lagi</button></div></div>`;
};
export function orders() {
  if (!S.user) return loginCard("Masuk untuk melihat pesananmu", "Pesanan dan statusnya tampil real-time di sini.");
  return `<h2 style="margin-bottom:14px">Pesanan saya</h2>${live("olist", ["orders", "errors", "products"], () => S.errors.orders ? `<div class="alert">Pesanan belum bisa dimuat (${esc(S.errors.orders)}). Publish <code>firestore.rules</code> terbaru.</div>` : S.orders.length ? `<div class="col">${S.orders.map(orderCard).join("")}</div>` : `<div class="empty">Belum ada pesanan.<br><a class="btn pri" href="#/" style="margin-top:12px">Mulai pesan</a></div>`)}`;
}
actions.cancel = async el => { if (await confirmBox("Batalkan pesanan ini?", "Pesanan yang sudah dibatalkan tidak bisa diaktifkan lagi.", "Ya, batalkan")) await F.updateDoc(F.doc(db, "orders", el.dataset.id), { status: "dibatalkan" }); };
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
forms.proof = async (f, fd) => { const file = fd.get("proof"); if (!file?.size) throw new Error("Pilih foto bukti transfer dulu."); await F.updateDoc(F.doc(db, "orders", f.dataset.id), { paymentProof: await compressImage(file, 1000) }); closeOverlay(); toast("Bukti terkirim. Admin akan memeriksa."); };

// ===== Chat =====
export function chat() {
  if (!S.user) return loginCard("Masuk untuk chat dengan admin", "Balasan admin muncul langsung di sini.");
  const wa = S.settings.whatsapp;
  return `<div class="row wrap" style="margin-bottom:12px"><h2>Chat dengan admin</h2><span class="sp"></span>${wa ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${esc(wa)}">${svg("wa", 16)} WhatsApp</a>` : ""}</div>
  <div class="chat"><div class="chat-head"><img class="av" src="./tubi-icon.png" alt=""><div><b>${esc(S.settings.whatsappName || "Admin Tubi")}</b><div class="muted xs">${esc(S.settings.hours ? "Buka " + S.settings.hours : "Biasanya membalas dalam beberapa menit")}</div></div></div>
  ${live("msgs", ["msgs", "errors"], () => `<div class="msgs">${S.errors.msgs ? `<div class="alert">Chat ditolak Firestore. Publish <code>firestore.rules</code> terbaru.</div>` : msgsHtml("user")}</div>`, () => { toEnd(); if (S.user && +S.chatMeta?.unreadUser > 0 && (location.hash.slice(1) === "/chat")) markRead(S.user.uid, "user"); })}
  ${chatForm()}</div>`;
}
export const afterChat = () => { toEnd(); if (S.user && +S.chatMeta?.unreadUser > 0) markRead(S.user.uid, "user"); };

// ===== Akun & pengaturan =====
const loginCard = (t, d) => `<div class="card" style="max-width:460px;margin:30px auto;text-align:center;display:grid;gap:12px;justify-items:center"><img src="./tubi-icon.png" style="width:72px;border-radius:20px" alt=""><h2>${t}</h2><p class="muted">${d}</p><button class="btn pri" data-act="login">Masuk dengan Google</button></div>`;
const themeBox = () => { const t = themePref(); return `<div class="seg">${[["auto", "Otomatis"], ["light", "Terang"], ["dark", "Gelap"]].map(([k, l]) => `<button class="${t === k ? "on" : ""}" data-act="theme" data-t="${k}">${l}</button>`).join("")}</div>`; };
const prefsCard = () => `<div class="card col"><h3>Pengaturan tampilan</h3><div><div class="lbl">Tema</div>${themeBox()}</div>
  <label class="chk"><input type="checkbox" data-change="sound" ${ls.get("sound", true) !== false ? "checked" : ""}> Suara notifikasi</label>
  <button class="btn sm" data-act="clearlocal">Hapus data lokal (keranjang & favorit)</button></div>`;
export function account() {
  if (!S.user) return `<div class="two eq">${loginCard("Masuk ke Tubi", "Simpan alamat, pantau pesanan, chat admin, dan beri ulasan.")}${prefsCard()}</div>`;
  const p = S.profile;
  return `<div class="two eq"><div class="col"><div class="card col"><div class="row"><span class="av" style="width:56px;height:56px">${p.photoURL ? `<img src="${esc(p.photoURL)}" alt="">` : initial(p.displayName)}</span><div><b>${esc(p.displayName)}</b><div class="muted sm">${esc(S.user.email || "")}</div>${S.isAdmin ? `<span class="chip st-diproses">${isMain(S.user) ? "Admin utama" : "Admin"}</span>` : ""}</div></div>
    ${S.isAdmin ? `<a class="btn pri" href="#/admin">${svg("grid", 18)} Buka dashboard admin</a>` : ""}
    <form class="col" data-form="profile"><h3>Data pengantaran</h3><label>Nama penerima<input name="name" value="${esc(p.recipientName || p.displayName || "")}"></label><label>No. WhatsApp<input name="phone" inputmode="tel" value="${esc(p.phone || "")}"></label><label>Alamat<textarea name="address" placeholder="Alamat lengkap">${esc(p.address || "")}</textarea></label>
    <div class="row wrap"><button type="button" class="btn" data-act="proloc">${svg("pin", 18)} ${p.location?.lat ? "Ubah titik lokasi" : "Pilih titik lokasi"}</button>${p.location?.lat ? `<span class="chip st-selesai">✓ Titik tersimpan</span>` : ""}</div><button class="btn pri" type="submit">Simpan</button></form></div>
    <div class="card col danger-zone"><h3>Zona akun</h3><button class="btn" data-act="logout">${svg("logout", 18)} Keluar</button><button class="btn danger" data-act="delacct">${svg("trash", 18)} Hapus akun saya</button><small class="muted">Menghapus akun akan menghapus profil, chat, dan ulasanmu. Riwayat pesanan tetap tersimpan untuk pembukuan toko.</small></div></div>
  <div class="col">${prefsCard()}
    <form class="card col" data-form="bug"><h3>Laporkan masalah</h3><p class="muted sm" style="margin:-6px 0 0">Ada yang tidak berjalan? Ceritakan, tim Tubi akan memeriksanya.</p><label>Jenis<select name="type"><option>Pesanan</option><option>Pembayaran</option><option>Login</option><option>Produk</option><option>Lokasi / peta</option><option>Lainnya</option></select></label><label>Deskripsi<textarea name="description" required placeholder="Apa yang terjadi?"></textarea></label><label>Tangkapan layar <span class="hint">(opsional)</span>${dropzone("shot", "", "Unggah tangkapan layar")}</label><button class="btn pri" type="submit">${svg("send", 17)} Kirim laporan</button></form></div></div>`;
}
forms.profile = async (f, fd) => {
  const d = { recipientName: String(fd.get("name")).trim(), phone: String(fd.get("phone")).trim(), address: String(fd.get("address")).trim() };
  await F.setDoc(F.doc(db, "users", S.user.uid), d, { merge: true }); Object.assign(S.profile, d); toast("Profil disimpan.");
};
forms.bug = async (f, fd) => {
  const sh = fd.get("shot"); const shot = sh && sh.size ? await compressImage(sh, 900) : "";
  await F.addDoc(F.collection(db, "bugReports"), { userId: S.user.uid, email: S.user.email || "", type: fd.get("type"), description: String(fd.get("description")).trim(), orderId: "", screenshot: shot, status: "baru", createdAt: F.serverTimestamp() });
  f.reset(); $$(".drop-pv", f).forEach(x => x.innerHTML = "🖼"); toast("Laporan terkirim ke admin. Terima kasih!");
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
actions.theme = el => { setTheme(el.dataset.t); $$(".seg").forEach(s => $$("button", s).forEach(b => b.classList.toggle("on", b.dataset.t === el.dataset.t))); };
actions.themetoggle = () => setTheme(document.body.classList.contains("dark") ? "light" : "dark");
actions.sound = t => { ls.set("sound", t.checked); toast(t.checked ? "Suara aktif" : "Suara dimatikan"); };
actions.clearlocal = async () => { if (await confirmBox("Hapus data lokal?", "Keranjang dan daftar favorit di perangkat ini akan dikosongkan.", "Hapus")) { S.cart = []; S.favs = []; saveCart(); saveFavs(); emit("cart"); repaint("grid"); toast("Data lokal dihapus."); } };
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
const payMethodOf = o => { const k = o.payment?.viaKey || ""; if (k === "qris") return { name: "QRIS", qris: true }; const id = k.replace(/^m:/, ""); return payMethods().find(m => m.id === id) || payMethods().find(m => m.name === o.payment?.via) || null; };
const payBody = id => {
  const o = S.orders.find(x => x.id === id);
  if (!o) return `<div class="empty">${S.user ? "Memuat pesanan…" : "Masuk untuk melihat pembayaran."}</div>`;
  const m = payMethodOf(o), paid = o.payment?.status === "paid", st = statusOf(o.status);
  const state = paid ? `<span class="chip st-selesai">✓ Lunas</span>` : st === "dibatalkan" ? `<span class="chip st-dibatalkan">Pesanan dibatalkan</span>` : o.paymentProof ? `<span class="chip st-diproses">Bukti terkirim — menunggu dicek admin</span>` : `<span class="chip st-menunggu">Menunggu pembayaran</span>`;
  return `<div class="card col pay-card"><div class="row wrap"><div class="sp"><div class="muted sm">Pesanan #${esc(o.id.slice(0, 6).toUpperCase())}</div><div class="pay-total">${rupiah(o.total)}</div></div>${state}</div>
  <button class="btn sm" data-act="copy" data-t="${Math.round(o.total)}">Salin jumlah</button>
  ${o.payment?.method !== "transfer" ? `<div class="alert ok">Pesanan ini dibayar di tempat (COD).</div>` : `<div class="payline"><b>Bayar lewat: ${esc(o.payment?.via || "Transfer")}</b>
    ${m?.qris ? (S.settings.payQris ? `<img class="qris" src="${esc(S.settings.payQris)}" alt="QRIS"><small class="muted">Scan dengan aplikasi bank / e-wallet apa pun, nominal ${rupiah(o.total)}. Layar bisa disimpan sebagai gambar.</small>` : `<span class="muted">QRIS belum tersedia.</span>`)
      : m ? `${m.detail ? `<pre>${esc(m.detail)}</pre><div class="row wrap"><button class="btn sm" data-act="copy" data-t="${esc(m.detail)}">Salin rekening / nomor</button></div>` : ""}${m.link ? `<a class="btn pri" target="_blank" rel="noopener" href="${esc(m.link)}">Buka halaman pembayaran ↗</a>` : ""}` : `<span class="muted">Detail pembayaran tidak ditemukan. Hubungi admin lewat chat.</span>`}</div>
    ${paid ? "" : `<form class="col" data-form="proof" data-id="${o.id}"><div class="lbl">Bukti pembayaran</div>${o.paymentProof ? `<img src="${esc(o.paymentProof)}" alt="Bukti" style="width:100%;max-width:280px;border-radius:14px;border:1px solid var(--line)">` : ""}${dropzone("proof", "", o.paymentProof ? "Ganti bukti transfer" : "Unggah bukti transfer")}<button class="btn pri" type="submit">${o.paymentProof ? "Kirim ulang bukti" : "Kirim bukti pembayaran"}</button></form>`}`}
  <div class="row wrap"><a class="btn sp" href="#/orders">Lihat pesanan saya</a><a class="btn sp" href="#/chat">${svg("chat", 16)} Tanya admin</a></div></div>`;
};
export function pay() {
  const id = (location.hash.slice(1).split("/")[2] || "");
  if (!S.user) return loginCard("Masuk untuk melihat pembayaran", "Pembayaran terkait akunmu.");
  return `<a class="back-link" href="#/orders">‹ Pesanan saya</a><h2 style="margin:8px 0 14px">Selesaikan pembayaran</h2>${live("paypg", ["orders"], () => payBody(id))}`;
}
