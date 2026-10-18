import { db, F } from "./firebase.js";
import { S } from "./data.js";
import { forms, actions, openOverlay, closeOverlay } from "./core.js";
import { $, esc, hm, svg, toast } from "./util.js";
import { confirmBox } from "./ui.js";

const myUid = () => S.user?.uid;
const threadUid = () => S.isAdmin ? S.openChat : S.user?.uid;
const visible = () => S.msgs.filter(m => !(m.hiddenFor || []).includes(myUid()));
export const msgsHtml = me => {
  const l = visible();
  return l.length ? l.map(m => `<div class="msg ${m.from === me ? "me" : "th"}"><div class="bub" data-act="msgmenu" data-id="${m.id}">${esc(m.text)}</div><small>${hm(m.createdAt)} <button class="mm" data-act="msgmenu" data-id="${m.id}" aria-label="Opsi pesan">⋮</button></small></div>`).join("")
    : `<div class="empty" style="margin:auto">${me === "admin" ? "Belum ada pesan di percakapan ini." : "Mulai percakapan dengan admin Tubi — tanya menu, stok, atau status pesanan."}</div>`;
};
export const chatForm = () => `<form class="cform" data-form="chat"><textarea name="text" rows="1" placeholder="Tulis pesan…" data-grow data-enter-submit maxlength="2000" required></textarea><button class="btn pri" type="submit" aria-label="Kirim">${svg("send")}</button></form>`;
export const toEnd = () => { const b = $(".msgs"); if (b) b.scrollTop = b.scrollHeight; };

export async function sendMsg(uid, from, text) {
  const { addDoc, setDoc, doc, collection, serverTimestamp, increment } = F;
  try {
    await addDoc(collection(db, "chats", uid, "messages"), { from, text, senderId: S.user.uid, createdAt: serverTimestamp() });
    const meta = from === "admin"
      ? { lastFrom: "admin", unreadUser: increment(1) }
      : { uid, name: S.profile.displayName || "Pelanggan", email: S.user.email || "", photoURL: S.profile.photoURL || "", phone: S.profile.phone || "", lastFrom: "user", unreadAdmin: increment(1) };
    await setDoc(doc(db, "chats", uid), { ...meta, lastMessage: text.slice(0, 120), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    if (e.code === "permission-denied") throw new Error("Ditolak Firestore. Publish firestore.rules terbaru di Firebase Console (lihat README).");
    throw e;
  }
}
export async function markRead(uid, who) {
  try { await F.setDoc(F.doc(db, "chats", uid), who === "admin" ? { unreadAdmin: 0 } : { unreadUser: 0 }, { merge: true }); } catch {}
}
forms.chat = async (f, fd) => {
  const text = String(fd.get("text") || "").trim(); if (!text) return;
  const uid = threadUid(); if (!uid) return;
  f.reset(); f.querySelector("textarea").style.height = "auto";
  await sendMsg(uid, S.isAdmin ? "admin" : "user", text);
};

// ---- Hapus pesan: untuk saya / untuk semua orang ----
actions.msgmenu = el => {
  const m = S.msgs.find(x => x.id === el.dataset.id); if (!m) return;
  const mine = m.senderId === myUid(), canAll = mine || S.isAdmin;
  openOverlay(`<div class="sheet-head"><h3>Opsi pesan</h3><button class="icon-btn" data-act="close">${svg("x")}</button></div>
    <div class="quote">${esc(m.text)}</div>
    <div class="col" style="margin-top:14px"><button class="btn" data-act="msgcopy" data-id="${m.id}">Salin teks</button>
    <button class="btn" data-act="msgdel" data-id="${m.id}" data-m="me">${svg("trash", 17)} Hapus untuk saya</button>
    ${canAll ? `<button class="btn danger" data-act="msgdel" data-id="${m.id}" data-m="all">${svg("trash", 17)} Hapus untuk semua orang</button>` : ""}
    <small class="muted">“Hapus untuk saya” hanya menyembunyikan di akunmu. “Hapus untuk semua orang” menghapus permanen dari kedua sisi.</small></div>`);
};
actions.msgcopy = async el => { const m = S.msgs.find(x => x.id === el.dataset.id); try { await navigator.clipboard.writeText(m?.text || ""); toast("Disalin ✓"); } catch { toast("Tidak bisa menyalin.", "err"); } closeOverlay(); };
actions.msgdel = async el => {
  const uid = threadUid(), ref = F.doc(db, "chats", uid, "messages", el.dataset.id); closeOverlay();
  if (el.dataset.m === "all") {
    if (!await confirmBox("Hapus untuk semua orang?", "Pesan ini akan hilang permanen bagi kamu dan lawan bicara.", "Hapus")) return;
    await F.deleteDoc(ref);
  } else await F.updateDoc(ref, { hiddenFor: F.arrayUnion(myUid()) });
  toast("Pesan dihapus.");
};
