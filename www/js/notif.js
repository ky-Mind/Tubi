// Pusat notifikasi (lonceng) ala Shopee untuk admin & pelanggan + notifikasi sistem + suara "TUBI".
// Notifikasi dibuat dari perubahan data realtime. Keadaan terakhir disimpan per akun di perangkat,
// jadi kejadian saat aplikasi tertutup (pesanan baru, status berubah, chat masuk) tetap muncul saat dibuka lagi.
import { S, emit, statusOf, STATUS_LABEL } from "./data.js";
import { actions, openOverlay, closeOverlay, go, live } from "./core.js";
import { ls, esc, svg, toast, rupiah, normPhone } from "./util.js";
import { db, F } from "./firebase.js";

const MAX = 60;
const kunci = n => `tubi-${n}:${S.user?.uid || "-"}`;
const muat = (n, d) => { try { return JSON.parse(localStorage.getItem(kunci(n))) ?? d; } catch { return d; } };
const simpan = (n, v) => { try { localStorage.setItem(kunci(n), JSON.stringify(v)); } catch {} };
export const N = { list: [] };
// Kejadian yang dibuat pengguna sendiri (mis. membatalkan pesanan) tidak perlu dikabarkan lagi lewat notifikasi
export const abaikanNotif = new Set();
export const unread = () => N.list.filter(x => !x.read).length;

// ---------- Suara ----------
let audio;
export function playSound() {
  if (ls.get("sound", true) === false) return;
  try {
    audio = audio || new Audio(new Audio().canPlayType("audio/ogg") ? "./assets/suara/tubi.ogg" : "./assets/suara/tubi.mp3");
    audio.currentTime = 0; audio.play().catch(() => {});
  } catch {}
}
// Browser memblokir suara sebelum ada sentuhan pertama: siapkan audio saat pengguna pertama kali mengetuk.
addEventListener("pointerdown", () => { if (!audio) { try { audio = new Audio(new Audio().canPlayType("audio/ogg") ? "./assets/suara/tubi.ogg" : "./assets/suara/tubi.mp3"); audio.load(); } catch {} } }, { once: true });

// ---------- Notifikasi sistem ----------
// APK: notifikasi Android asli lewat @capacitor/local-notifications (ikon logo Tubi di status bar, suara "Tubiii").
// Web: Notification API / service worker.
const native = () => !!window.Capacitor?.isNativePlatform?.();
const LN = () => window.Capacitor?.Plugins?.LocalNotifications;
let izinNative = "prompt";
const CH_SUARA = "tubi-pesanan", CH_SENYAP = "tubi-senyap";
async function siapkanNative() {
  const ln = LN(); if (!ln) return;
  try {
    await ln.createChannel({ id: CH_SUARA, name: "Pesanan & chat", description: "Pesanan baru, status pesanan, pembayaran, dan chat", importance: 5, visibility: 1, sound: "tubi.ogg", vibration: true, lights: true, lightColor: "#C8232C" });
    await ln.createChannel({ id: CH_SENYAP, name: "Pesanan & chat (tanpa suara)", importance: 3, visibility: 1, vibration: true });
    // Tombol langsung di notifikasi HP: balas (ketik di notifikasi), WhatsApp, terima pembayaran
    const balas = { id: "balas", title: "Balas", input: true, inputButtonTitle: "Kirim", inputPlaceholder: "Tulis balasan…" };
    await ln.registerActionTypes({ types: [
      { id: "pesanan", actions: [balas, { id: "wa", title: "WhatsApp" }, { id: "lihat", title: "Lihat" }] },
      { id: "bukti", actions: [{ id: "terima", title: "Terima pembayaran" }, { id: "lihat", title: "Lihat bukti" }] },
      { id: "chat", actions: [balas, { id: "wa", title: "WhatsApp" }, { id: "dibaca", title: "Tandai dibaca" }] },
      { id: "pesanan-nowa", actions: [balas, { id: "lihat", title: "Lihat" }] },
      { id: "chat-nowa", actions: [balas, { id: "dibaca", title: "Tandai dibaca" }] },
      { id: "balasan", actions: [balas, { id: "dibaca", title: "Tandai dibaca" }] }
    ] });
    izinNative = (await ln.checkPermissions()).display;
    // Pertama kali dibuka: langsung minta izin notifikasi (Android 13+ menampilkan dialog izin)
    if (izinNative === "prompt" || izinNative === "prompt-with-rationale") izinNative = (await ln.requestPermissions()).display;
    ln.addListener("localNotificationActionPerformed", e => aksiNotif(e).catch(err => console.warn("aksi notifikasi", err)));
    emit("notif");
  } catch (e) { console.warn("notifikasi native", e); }
}
if (native()) setTimeout(siapkanNative, 1500);
// Tombol di notifikasi ditekan (aplikasi masih berjalan di latar belakang)
async function aksiNotif(e) {
  const n = e?.notification || {}, x = n.extra || {}, a = e?.actionId;
  const tutup = () => LN()?.cancel({ notifications: [{ id: n.id }] }).catch(() => {});
  if (a === "wa" && x.phone) { tutup(); window.open("https://wa.me/" + x.phone, "_system"); return; }
  if (a === "balas") {
    const teks = String(e.inputValue || "").trim(); if (!teks) return;
    const { sendMsg } = await import("./chat.js");
    await sendMsg(S.isAdmin ? x.uid : S.user?.uid, S.isAdmin ? "admin" : "user", { text: teks });
    tutup(); return;
  }
  if (a === "dibaca") { await bacaChat(S.isAdmin ? x.uid : S.user?.uid); tutup(); return; }
  if (a === "terima" && x.order && S.isAdmin) {
    await F.updateDoc(F.doc(db, "orders", x.order), { "payment.status": "paid", "payment.note": "", "payment.paidAt": Date.now(), updatedAt: F.serverTimestamp() });
    tutup(); sysShow({ title: `Pembayaran ${short(x.order)} diterima`, body: "Pelanggan sudah diberi tahu." }, true); return;
  }
  if (x.href) go(x.href);   // ketuk notifikasi / "Lihat"
}
const sysOk = () => native() ? izinNative === "granted" : "Notification" in window && Notification.permission === "granted";
let nomor = Date.now() % 100000;
async function sysShow(n, paksa) {
  if (!sysOk() || (!paksa && ls.get("sysnotif", true) === false)) return false;
  if (native()) {
    try {
      await LN().schedule({ notifications: [{ id: ++nomor, title: n.title, body: n.body || "", largeBody: n.body || "", channelId: ls.get("sound", true) === false ? CH_SENYAP : CH_SUARA, smallIcon: "ic_stat_tubi", iconColor: "#C8232C", extra: { href: n.href || "", ...(n.ext || {}) }, ...(n.aksi ? { actionTypeId: n.aksi } : {}), group: "tubi" }] });
      return true;
    } catch { return false; }
  }
  const opt = { body: n.body, icon: "./tubi-icon-192.png", badge: "./tubi-icon-192.png", tag: n.id, data: { href: n.href }, silent: false };
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg) { await reg.showNotification(n.title, opt); return true; } } catch {}
  try { const x = new Notification(n.title, opt); x.onclick = () => { focus(); if (n.href) go(n.href); x.close(); }; return true; } catch { return false; }
}
export async function askPermission() {
  if (native()) {
    const ln = LN(); if (!ln) throw new Error("Notifikasi belum tersedia di versi aplikasi ini.");
    izinNative = (await ln.requestPermissions()).display; emit("notif");
    if (izinNative === "granted") { toast("Notifikasi diaktifkan"); sysShow({ title: "Notifikasi Tubi aktif", body: "Kabar pesanan & chat akan muncul di sini." }, true); }
    else toast("Izin notifikasi ditolak. Aktifkan lewat Pengaturan HP → Aplikasi → Tubi → Notifikasi.", "err");
    return;
  }
  if (!("Notification" in window)) throw new Error("Perangkat ini belum mendukung notifikasi browser.");
  const p = await Notification.requestPermission(); emit("notif");
  if (p === "granted") { toast("Notifikasi diaktifkan"); playSound(); } else toast("Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.", "err");
}

// ---------- Tambah notifikasi ----------
function tambah(n, diam) {
  const item = { id: n.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), at: Date.now(), read: false, ...n };
  if (N.list.some(x => x.id === item.id)) return;
  N.list.unshift(item); N.list = N.list.slice(0, MAX); simpan("notif", N.list); emit("notif");
  if (diam) return;
  // Kartu pop-up di dalam aplikasi sudah dihapus: kabar muncul sebagai notifikasi HP (dan di lonceng).
  if (native() && pushAktif && document.hidden) return;   // di latar belakang: push dari server sudah mengabari
  sysShow(item).then(ok => { if (!(ok && native())) playSound(); });   // tanpa toast di dalam aplikasi: kabar cukup lewat notifikasi HP + lonceng
}
// ---------- Deteksi perubahan ----------
let siap = false;
export function initNotif() { N.list = muat("notif", []); siap = true; emit("notif"); if (native() && S.user) siapkanPush(); }

// ---------- Push dari server (FCM) ----------
// Notifikasi tetap masuk walau Tubi tertutup: HP didaftarkan ke Firebase Cloud Messaging, tokennya disimpan di
// pushTokens/{token} = { uid, email }. Gateway Tubi (Cloudflare) yang mengirim push saat ada pesanan / chat.
const PN = () => window.Capacitor?.Plugins?.PushNotifications;
let tokenPush = null, pushDengar = false, pushAktif = false;
async function simpanToken(t) {
  if (!S.user || !t) return;
  tokenPush = t;
  try { await F.setDoc(F.doc(db, "pushTokens", t), { uid: S.user.uid, email: String(S.user.email || "").toLowerCase(), platform: "android", updatedAt: F.serverTimestamp() }); pushAktif = true; }
  catch (e) { console.warn("simpan token push", e); }
}
async function siapkanPush() {
  const pn = PN(); if (!pn) return;
  try {
    if (!pushDengar) {
      pushDengar = true;
      pn.addListener("registration", t => simpanToken(t.value));
      pn.addListener("registrationError", e => console.warn("daftar push gagal", e));
      pn.addListener("pushNotificationActionPerformed", e => { const h = e?.notification?.data?.href; if (h) go(h); });
    }
    let izin = (await pn.checkPermissions()).receive;
    if (izin === "prompt" || izin === "prompt-with-rationale") izin = (await pn.requestPermissions()).receive;
    if (izin === "granted") await pn.register();
  } catch (e) { console.warn("push", e); }
}
// Dipanggil sebelum keluar akun: HP ini berhenti menerima push untuk akun tersebut
export async function lepasPush() {
  if (!tokenPush) return;
  try { await F.deleteDoc(F.doc(db, "pushTokens", tokenPush)); } catch {}
  pushAktif = false;
}
const short = id => "#" + id.slice(0, 6).toUpperCase();
const CLIENT_TXT = { diproses: ["chef", "Pesanan sedang diproses", "Dapur Tubi sedang menyiapkan pesananmu."], siap: ["bike", "Pesanan siap", "Pesananmu siap diantar / diambil."], selesai: ["star", "Pesanan selesai", "Terima kasih! Yuk beri ulasan untuk menu yang kamu pesan."], dibatalkan: ["x", "Pesanan dibatalkan", "Pesananmu dibatalkan. Hubungi admin bila ada pertanyaan."] };

export function cekPesanan() {
  if (!siap || !S.user) return;
  const lama = muat("ord", null), baru = {};
  // p = status pembayaran (unpaid / paid / issue), b = tanda unggahan bukti (waktu unggah, agar unggah ulang juga terdeteksi)
  S.orders.forEach(o => baru[o.id] = { s: statusOf(o.status), p: o.payment?.status || "", b: o.payment?.proofAt || (o.paymentProof ? 1 : 0) });
  simpan("ord", baru);
  if (!lama) return;   // pertama kali di perangkat ini: catat saja, tanpa notifikasi lama
  S.orders.forEach(o => {
    const a = lama[o.id], b = baru[o.id], k = short(o.id);
    if (S.isAdmin) {
      if (!a && b.s === "menunggu") tambah({ aksi: o.phone ? "pesanan" : "pesanan-nowa", ext: { order: o.id, uid: o.userId || "", phone: normPhone(o.phone) }, id: "new-" + o.id, icon: "receipt", tone: "red", title: `Pesanan baru ${k}`, body: `${o.customerName || "Pelanggan"} · ${rupiah(o.total)} · ${o.payment?.via || (o.payment?.method === "transfer" ? "Transfer" : "COD")}`, href: "/admin/orders" });
      if (a && b.b && a.b !== b.b && b.p !== "paid") tambah({ aksi: "bukti", ext: { order: o.id }, id: `proof-${o.id}-${b.b}`, icon: "coin", tone: "teal", kind: "proof", order: o.id, title: `Bukti pembayaran masuk ${k}`, body: `${o.customerName || "Pelanggan"} · ${o.payment?.via || "Transfer"} · ${rupiah(o.total)}`, href: "/admin/orders" });
      if (a && a.s !== "dibatalkan" && b.s === "dibatalkan") tambah({ id: "cancel-" + o.id, icon: "x", tone: "gray", title: `Pesanan dibatalkan ${k}`, body: o.customerName || "", href: "/admin/orders" }, true);
    } else {
      if (a && a.s !== b.s && CLIENT_TXT[b.s] && !abaikanNotif.has(o.id + ":" + b.s)) { const [ic, t, d] = CLIENT_TXT[b.s]; tambah({ id: `st-${o.id}-${b.s}`, icon: ic, tone: b.s === "dibatalkan" ? "gray" : "red", title: `${t} ${k}`, body: d, href: "/orders" }); }
      if (a && a.p !== "paid" && b.p === "paid") tambah({ id: "paid-" + o.id, icon: "check", tone: "teal", title: `Pembayaran diterima ${k}`, body: `Pembayaran ${rupiah(o.total)} sudah dikonfirmasi. Terima kasih!`, href: "/pay/" + o.id });
      if (a && a.p !== "issue" && b.p === "issue") tambah({ id: `issue-${o.id}-${Date.now()}`, icon: "alert", tone: "yellow", title: `Ada kendala pembayaran ${k}`, body: o.payment?.note || "Silakan cek halaman pembayaran.", href: "/pay/" + o.id });
    }
  });
}
export function cekChat() {
  if (!siap || !S.user) return;
  if (S.isAdmin) {
    const lama = muat("chat", null), baru = {};
    S.chats.forEach(c => baru[c.id] = +c.unreadAdmin || 0); simpan("chat", baru);
    if (!lama) return;
    S.chats.forEach(c => { if ((baru[c.id] || 0) > (lama[c.id] || 0) && c.lastFrom === "user" && c.id !== S.user.uid)
      tambah({ aksi: c.phone ? "chat" : "chat-nowa", ext: { uid: c.id, phone: normPhone(c.phone) }, id: `chat-${c.id}-${c.updatedAt?.seconds || Date.now()}`, icon: "chat", tone: "teal", title: `Pesan baru dari ${c.name || "Pelanggan"}`, body: String(c.lastMessage || "").slice(0, 90), href: "/admin/chat" }, location.hash === "#/admin/chat"); });
  } else {
    const lama = muat("chat", null), n = +S.chatMeta?.unreadUser || 0; simpan("chat", n);
    if (lama === null) return;
    if (n > lama && S.chatMeta?.lastFrom === "admin") tambah({ aksi: "balasan", id: `chat-${S.chatMeta?.updatedAt?.seconds || Date.now()}`, icon: "chat", tone: "teal", title: "Balasan dari Admin Tubi", body: String(S.chatMeta?.lastMessage || "").slice(0, 90), href: "/chat" }, location.hash === "#/chat");
  }
}
export function cekLaporan() {
  if (!siap || !S.isAdmin) return;
  const lama = muat("bug", null), ids = S.bugs.map(b => b.id); simpan("bug", ids);
  if (!lama) return;
  S.bugs.filter(b => !lama.includes(b.id) && b.status !== "selesai").forEach(b => tambah({ id: "bug-" + b.id, icon: "alert", tone: "gray", title: "Laporan masalah baru", body: `${b.type || ""} · ${String(b.description || "").slice(0, 70)}`, href: "/admin/settings/sistem" }));
}

// ---------- Tampilan: tombol lonceng & panel ----------
export const bell = cls => live("bell-" + cls, ["notif", "auth"], () => S.user ? `<button class="icon-btn bell ${cls}" data-act="notifs" aria-label="Notifikasi" data-l="Notifikasi">${svg("bell")}<span class="badge ${unread() ? "" : "z"}">${unread() > 99 ? "99+" : unread()}</span></button>` : "");
const waktu = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? "baru saja" : m < 60 ? m + " mnt lalu" : m < 1440 ? Math.floor(m / 60) + " jam lalu" : new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" }); };
function panel() {
  const izin = native() ? (izinNative === "granted" ? "granted" : "default") : "Notification" in window ? Notification.permission : "unsupported";
  return `${izin === "default" ? `<div class="n-ask">${svg("bell", 22)}<span class="sp"><b>Aktifkan notifikasi</b><small>Dapat kabar pesanan & chat walau Tubi tidak sedang dibuka.</small></span><button class="btn pri sm" data-act="notifallow">Aktifkan</button></div>` : ""}
  ${N.list.length ? `<div class="n-list">${N.list.map(n => { const o = n.kind === "proof" && S.isAdmin ? S.orders.find(x => x.id === n.order) : null, cek = o && o.payment?.status !== "paid" && statusOf(o.status) !== "dibatalkan";
    return `<div class="n-item ${n.read ? "" : "new"}" role="button" tabindex="0" data-act="notifopen" data-id="${esc(n.id)}"><i class="t-${n.tone || "red"}">${svg(n.icon || "bell", 20)}</i><span class="sp"><b>${esc(n.title)}</b>${n.body ? `<small>${esc(n.body)}</small>` : ""}<em>${waktu(n.at)}${o && !cek ? " · sudah ditangani" : ""}</em>
    ${cek ? `<span class="n-act">${o.paymentProof ? `<button class="btn sm ghost" data-act="proofview" data-id="${o.id}">Lihat bukti</button>` : ""}<button class="btn sm s-selesai" data-act="opaid" data-id="${o.id}">Terima</button><button class="btn sm" data-act="opissue" data-id="${o.id}">Ada kendala</button></span>` : ""}</span></div>`; }).join("")}</div>`
    : `<div class="m-empty">${svg("bell", 34)}<b>Belum ada notifikasi</b><span>${S.isAdmin ? "Pesanan baru, bukti bayar, dan chat pelanggan akan muncul di sini." : "Kabar status pesanan, pembayaran, dan balasan chat akan muncul di sini."}</span></div>`}`;
}
actions.notifs = () => openOverlay(`<div class="sheet-head"><h3>Notifikasi</h3><div class="row">${N.list.some(x => !x.read) ? `<button class="btn sm ghost" data-act="notifreadall">Tandai dibaca</button>` : ""}<button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div></div>${live("npanel", ["notif", "orders"], panel)}
  <div class="row" style="margin-top:12px"><label class="chk sp"><input type="checkbox" data-change="sound" ${ls.get("sound", true) !== false ? "checked" : ""}> Suara notifikasi "TUBI"</label><button class="btn sm ghost" data-act="notiftest">${svg("bell", 15)} Tes suara</button></div>`, "drawer");
actions.notifallow = () => askPermission();
actions.notiftest = async () => { closeOverlay(); const n = { title: "Tes notifikasi Tubi", body: "Begini tampilan dan suara notifikasi pesanan & chat." };
  const ok = await sysShow(n, true); if (!(ok && native())) playSound(); if (!ok) toast(sysOk() ? "Notifikasi gagal ditampilkan." : "Aktifkan izin notifikasi dulu supaya kabar pesanan muncul di HP."); };
// Tandai dibaca: lonceng, angka chat (desktop & HP), dan notifikasi yang masih ada di bilah notifikasi HP
async function bacaChat(uid) {
  const { markRead } = await import("./chat.js");
  if (S.isAdmin) await Promise.all(S.chats.filter(c => +c.unreadAdmin > 0 && (!uid || c.id === uid)).map(c => markRead(c.id, "admin")));
  if (S.user && (!S.isAdmin || uid === S.user.uid) && +S.chatMeta?.unreadUser > 0) await markRead(S.user.uid, "user");
  N.list.forEach(x => { if (String(x.id).startsWith("chat-") && (!uid || !S.isAdmin || x.ext?.uid === uid || x.href === "/chat")) x.read = true; });
  simpan("notif", N.list); emit("notif");
}
export const tandaiChatDibaca = bacaChat;
actions.notifreadall = async () => {
  N.list.forEach(x => x.read = true); simpan("notif", N.list); emit("notif");
  await bacaChat();
  if (native()) LN()?.removeAllDeliveredNotifications?.().catch(() => {});
  toast("Semua notifikasi & chat ditandai dibaca");
};
actions.notifopen = el => { const n = N.list.find(x => x.id === el.dataset.id); if (!n) return; n.read = true; simpan("notif", N.list); emit("notif"); closeOverlay(); if (n.href) go(n.href); };
// Dipakai modul lain (mis. pembaruan aplikasi) untuk mengirim notifikasi HP langsung
export const notifSistem = (title, body, href = "") => sysShow({ title, body, href }, true);
