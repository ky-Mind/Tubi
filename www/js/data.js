// Satu sumber data realtime untuk admin & pelanggan.
import { db, auth, A, F, FIXED_ADMINS } from "./firebase.js";
import { ls, secs } from "./util.js";


export const S = {
  ready: false, user: null, isAdmin: false, profile: {},
  products: [], settings: {}, reviews: [], orders: [], notifs: [], bugs: [], admins: [],
  chats: [], chatMeta: null, msgs: [], openChat: null, wa: null,
  cart: ls.get("cart", []), favs: ls.get("favs", []), errors: {}
};
const listeners = new Set();
export const onChange = fn => (listeners.add(fn), () => listeners.delete(fn));
export const emit = k => listeners.forEach(f => { try { f(k); } catch (e) { console.error(e); } });

let subs = [], pub = [];
const stop = () => { subs.forEach(u => { try { u(); } catch {} }); subs = []; };
const { collection, doc, onSnapshot, query, where, orderBy, limit } = F;

function watch(list, key, ref, apply) {
  list.push(onSnapshot(ref, snap => { delete S.errors[key]; apply(snap); emit(key); },
    err => { console.warn("[Tubi]", key, err.code, err.message); S.errors[key] = err.code || "error"; emit("errors"); }));
}
const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const byNew = (a, b) => secs(b.createdAt) - secs(a.createdAt);

function startPublic() {
  watch(pub, "products", collection(db, "products"), s => { S.products = rows(s); });
  watch(pub, "settings", doc(db, "settings", "store"), s => { S.settings = s.exists() ? s.data() : {}; });
  watch(pub, "reviews", collection(db, "productReviews"), s => { S.reviews = rows(s); });
}

function startUser() {
  const u = S.user; if (!u) return; const w = (k, r, f) => watch(subs, k, r, f);
  if (S.isAdmin) {
    w("orders", collection(db, "orders"), s => { S.orders = rows(s).sort(byNew); });
    w("chats", collection(db, "chats"), s => { S.chats = rows(s).sort((a, b) => secs(b.updatedAt) - secs(a.updatedAt)); });
    w("bugs", collection(db, "bugReports"), s => { S.bugs = rows(s).sort(byNew); });
    w("admins", collection(db, "admins"), s => { S.admins = s.docs.map(d => ({ id: d.id, ...d.data() })); });
    if (!isMain(u)) w("myadmin", doc(db, "admins", emailOf(u)), s => { if (!s.exists() && S.isAdmin) revoke(u); });
    w("wa", doc(db, "waGateway", "status"), s => { S.wa = s.exists() ? s.data() : null; });
  } else {
    w("orders", query(collection(db, "orders"), where("userId", "==", u.uid)), s => { S.orders = rows(s).sort(byNew); });
    w("chatMeta", doc(db, "chats", u.uid), s => { S.chatMeta = s.exists() ? s.data() : null; });
    w("msgs", query(collection(db, "chats", u.uid, "messages"), orderBy("createdAt", "asc"), limit(200)), s => { S.msgs = rows(s); });
  }
}

let threadUnsub = null;
export function openThread(uid) {
  threadUnsub?.(); S.openChat = uid; S.msgs = [];
  if (!uid) { emit("msgs"); return; }
  threadUnsub = onSnapshot(query(collection(db, "chats", uid, "messages"), orderBy("createdAt", "asc"), limit(200)),
    s => { S.msgs = rows(s); emit("msgs"); }, e => { S.errors.msgs = e.code; emit("errors"); });
}

export const emailOf = u => String(u?.email || "").trim().toLowerCase();
const withTimeout = (p, ms = 6000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
// Admin = admin utama (hilmykia@gmail.com) ATAU email yang terdaftar di koleksi `admins` (hanya admin utama yang bisa mengubahnya).
export const isMain = u => FIXED_ADMINS.includes(emailOf(u));
async function detectAdmin(u) {
  if (isMain(u)) return true;
  try { return (await withTimeout(F.getDoc(doc(db, "admins", emailOf(u))))).exists(); } catch { return false; }
}
function revoke(u) { if (S.user?.uid !== u.uid) return; S.isAdmin = false; ls.set("admin:" + emailOf(u), false); stop(); startUser(); emit("auth"); }
async function resolveUser(u) {
  const admin = await detectAdmin(u);
  if (S.user?.uid !== u.uid) return;
  const changed = admin !== S.isAdmin; S.isAdmin = admin; ls.set("admin:" + emailOf(u), admin && !isMain(u));
  try {
    const ref = doc(db, "users", u.uid), snap = await withTimeout(F.getDoc(ref)), p = snap.exists() ? snap.data() : {};
    const base = { displayName: p.displayName || u.displayName || "Pengguna Tubi", email: u.email || "", photoURL: p.photoURL || u.photoURL || "" };
    if (!snap.exists()) await F.setDoc(ref, { ...base, role: "customer", createdAt: F.serverTimestamp() });
    if (S.user?.uid === u.uid) S.profile = { ...p, ...base };
  } catch (e) { console.warn("profil:", e.code || e.message); if (e.code) S.errors.users = e.code; }
  if (changed) { stop(); startUser(); emit("auth"); } else emit("profile");
}

export function startAuth(onReady) {
  startPublic();
  A.getRedirectResult(auth).catch(() => {});
  const ready = () => { if (!S.ready) { S.ready = true; emit("auth"); onReady?.(); } };
  setTimeout(ready, 3500);   // jangan pernah macet di layar "Memuat…": lanjut sebagai tamu
  A.onAuthStateChanged(auth, u => {
    stop(); Object.assign(S, { user: u || null, profile: u ? { displayName: u.displayName || "Pengguna Tubi", email: u.email || "", photoURL: u.photoURL || "" } : {}, orders: [], chats: [], msgs: [], chatMeta: null, wa: null, openChat: null });
    S.isAdmin = !!u && (isMain(u) || ls.get("admin:" + emailOf(u), false));
    if (u) startUser();
    const first = !S.ready; S.ready = true; emit("auth"); if (first) onReady?.();
    if (u) resolveUser(u);
  });
}

export const signIn = async () => {
  try {
    // Cek apakah berjalan di perangkat native Android/iOS
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const GoogleAuthPlugin = window.Capacitor.Plugins.GoogleAuth;
      
      // WAJIB: Inisialisasi dulu plugin-nya agar tidak crash
      await GoogleAuthPlugin.initialize({
        clientId: '492656969625-ve14uoh2e4jo9v7f448skdga91uncr6q.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      const googleUser = await GoogleAuthPlugin.signIn();
      const idToken = googleUser.authentication.idToken;
      const credential = A.GoogleAuthProvider.credential(idToken);
      await A.signInWithCredential(auth, credential);
    } else {
      // Fallback jika dibuka lewat browser web biasa
      const p = new A.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      await A.signInWithPopup(auth, p);
    }
  } catch (e) {
    if (e !== "auth/popup-closed-by-user" && e.code !== "auth/operation-not-supported-in-this-environment") {
      if (e.code === "auth/popup-closed-by-user" || e === "popup_closed_by_user") throw new Error("Login dibatalkan");
      if (e.code === "auth/unauthorized-domain") throw new Error("Domain ini belum diizinkan di Firebase Authentication");
      throw new Error("Login Google gagal: " + (e.code || e.message));
    }
  }
};
export const signOutNow = () => A.signOut(auth);

// ---------- Hitungan ----------
export const avail = p => p && p.available !== false && p.availability !== "habis";
export const reviewsOf = id => S.reviews.filter(r => r.productId === id);
export function ratingOf(p) { const r = reviewsOf(p.id); return r.length ? r.reduce((a, x) => a + (+x.rating || 0), 0) / r.length : (+p.rating || 5); }
export const cartCount = () => S.cart.reduce((a, x) => a + x.qty, 0);
export function calc(code = "") {
  const st = S.settings, subtotal = S.cart.reduce((a, x) => a + x.price * x.qty, 0);
  const vOk = !!code && !!st.voucherCode && code.trim().toUpperCase() === String(st.voucherCode).toUpperCase() && (+st.voucherPct || 0) > 0;
  let discount = vOk ? Math.round(subtotal * (+st.voucherPct) / 100) : 0; if (vOk && +st.voucherMax > 0) discount = Math.min(discount, +st.voucherMax);
  const fee = !subtotal ? 0 : ((+st.freeShippingMin > 0 && subtotal >= +st.freeShippingMin) ? 0 : (+st.deliveryFee || 0));
  const tax = Math.round((subtotal - discount) * (+st.taxPct || 0) / 100);
  return { subtotal, discount, fee, tax, vOk, total: Math.max(0, subtotal - discount + fee + tax) };
}
export const saveCart = () => ls.set("cart", S.cart);
export const saveFavs = () => ls.set("favs", S.favs);
export const STATUSES = ["menunggu", "diproses", "siap", "selesai", "dibatalkan"];
export const statusOf = s => { const v = String(s || "menunggu").toLowerCase(); return v === "baru" ? "menunggu" : v; };
export const STATUS_LABEL = { menunggu: "Menunggu", diproses: "Diproses", siap: "Siap diambil/diantar", selesai: "Selesai", dibatalkan: "Dibatalkan" };
export const isFixedAdminEmail = m => FIXED_ADMINS.includes(String(m || "").toLowerCase());

// ---------- Metode pembayaran ----------
// settings.payMethods = [{ id, name, detail, link }]  (+ payQris = gambar QRIS, payCod = COD aktif)
// Data lama (payBank / payEwallet) otomatis dibaca sebagai metode.
export function payMethods() {
  const s = S.settings;
  if (Array.isArray(s.payMethods)) return s.payMethods;
  const l = [];
  if (s.payBank) l.push({ id: "legacy-bank", name: "Transfer bank", detail: s.payBank, link: "" });
  if (s.payEwallet) l.push({ id: "legacy-ewallet", name: "E-wallet", detail: s.payEwallet, link: "" });
  return l;
}
// Pilihan di checkout: [{ key, kind:'cod'|'transfer', name, hint, method? }]
export function payOptions() {
  const s = S.settings, o = [];
  if (s.payCod !== false) o.push({ key: "cod", kind: "cod", name: "Bayar di tempat (COD)", hint: "Bayar tunai saat pesanan tiba" });
  payMethods().forEach(m => o.push({ key: "m:" + m.id, kind: "transfer", name: m.name, hint: m.link ? "Transfer / bayar lewat tautan" : "Transfer ke rekening / e-wallet toko", method: m }));
  if (s.payQris) o.push({ key: "qris", kind: "transfer", name: "QRIS", hint: "Scan dengan aplikasi bank / e-wallet apa pun", method: { id: "qris", name: "QRIS", detail: "", link: "", qris: true } });
  return o.length ? o : [{ key: "cod", kind: "cod", name: "Bayar di tempat (COD)", hint: "Bayar tunai saat pesanan tiba" }];
}
