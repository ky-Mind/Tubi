// Chat pelanggan <-> admin ala WhatsApp: teks, emoji, foto (galeri / kamera), dokumen, balas pesan, reaksi, hapus.
// Lampiran disimpan langsung di dokumen pesan Firestore (foto dikompres, dokumen maks. ±600 KB).
import { db, F } from "./firebase.js";
import { S } from "./data.js";
import { forms, actions, openOverlay, closeOverlay } from "./core.js";
import { $, esc, hm, svg, toast, compressImage } from "./util.js";
import { confirmBox } from "./ui.js";

const myUid = () => S.user?.uid;
const threadUid = () => S.isAdmin ? S.openChat : S.user?.uid;
const visible = () => S.msgs.filter(m => !(m.hiddenFor || []).includes(myUid()));
const MAX_DOC = 600 * 1024;
const REACT = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const EMOJI = "😀 😁 😂 🤣 😊 😍 🥰 😘 😋 😎 🤩 🥳 😇 🙂 😉 😌 🤗 🤔 😴 😅 😢 😭 😡 😱 🙏 👍 👎 👌 👏 🙌 💪 🤝 ❤️ 🧡 💛 💚 💙 💜 🔥 ✨ 🎉 💯 ✅ ❌ ⏰ 📍 🛵 🍞 🍜 🥟 🍢 🍡 🧋 🥤 🍦 🍫 🌶️ 🧀 🍓 🫐".split(" ");

// Keadaan form chat yang sedang aktif
const C = { reply: null, att: null };
const day = ts => { try { const d = ts.toDate(), t = new Date(); const y = new Date(t); y.setDate(t.getDate() - 1);
  return d.toDateString() === t.toDateString() ? "Hari ini" : d.toDateString() === y.toDateString() ? "Kemarin" : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };
const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
const preview = m => m.text ? m.text : m.image ? "Foto" : m.file ? "Dokumen: " + (m.file.name || "") : "";

const replyBox = r => r ? `<div class="m-quote ${r.from === "admin" ? "a" : "u"}"><b>${r.from === (S.isAdmin ? "admin" : "user") ? "Kamu" : r.from === "admin" ? "Admin Tubi" : "Pelanggan"}</b><span>${esc(r.text || "")}</span></div>` : "";
const fileBox = f => `<a class="m-file" href="${esc(f.data)}" download="${esc(f.name || "dokumen")}" data-noact>${svg("file", 26)}<span><b>${esc(f.name || "Dokumen")}</b><small>${size(f.size || 0)} · ketuk untuk unduh</small></span>${svg("download", 18)}</a>`;
const reacts = m => { const r = Object.values(m.reactions || {}); if (!r.length) return ""; const c = {}; r.forEach(e => c[e] = (c[e] || 0) + 1);
  return `<div class="m-react" data-act="msgmenu" data-id="${m.id}">${Object.entries(c).map(([e, n]) => `<span>${e}${n > 1 ? n : ""}</span>`).join("")}</div>`; };

export const msgsHtml = me => {
  const l = visible();
  if (!l.length) return `<div class="m-empty">${svg("chat", 34)}<b>${me === "admin" ? "Belum ada pesan" : "Halo! Ada yang bisa kami bantu?"}</b><span>${me === "admin" ? "Pesan dari pelanggan akan muncul di sini." : "Tanya menu, stok, atau status pesanan. Admin Tubi akan membalas secepatnya."}</span></div>`;
  let last = "";
  return l.map(m => {
    const d = day(m.createdAt), sep = d && d !== last ? `<div class="m-day"><span>${d}</span></div>` : ""; if (d) last = d;
    const mine = m.from === me;
    return `${sep}<div class="msg ${mine ? "me" : "th"}${m.image && !m.text ? " pic" : ""}" id="m-${m.id}"><div class="bub" data-act="msgmenu" data-id="${m.id}">
      ${replyBox(m.replyTo)}${m.image ? `<img class="m-img" src="${esc(m.image)}" alt="Foto" data-act="msgimg" data-id="${m.id}" loading="lazy">` : ""}${m.file ? fileBox(m.file) : ""}
      ${m.text ? `<p>${esc(m.text)}</p>` : ""}<small class="m-t">${hm(m.createdAt)}</small></div>${reacts(m)}</div>`;
  }).join("");
};

export const chatForm = () => `<div class="c-compose">
  <div class="c-reply hidden" id="c-reply"></div><div class="c-att hidden" id="c-att"></div>
  <div class="c-emoji hidden" id="c-emoji">${EMOJI.map(e => `<button type="button" data-act="emo" data-e="${e}">${e}</button>`).join("")}</div>
  <form class="cform" data-form="chat">
    <button type="button" class="c-ib" data-act="emotoggle" aria-label="Emoji">${svg("smile", 22)}</button>
    <textarea name="text" rows="1" placeholder="Tulis pesan…" data-grow data-enter-submit maxlength="2000"></textarea>
    <button type="button" class="c-ib" data-act="attmenu" aria-label="Lampirkan">${svg("clip", 22)}</button>
    <label class="c-ib" aria-label="Kamera">${svg("camera", 22)}<input type="file" accept="image/*" capture="environment" data-change="attpick" hidden></label>
    <button class="c-send" type="submit" aria-label="Kirim">${svg("send", 20)}</button>
  </form>
  <input type="file" id="c-gal" accept="image/png,image/jpeg,image/webp,image/gif,image/heic" data-change="attpick" hidden>
  <input type="file" id="c-doc" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf" data-change="attpick" hidden>
</div>`;
export const toEnd = () => { const b = $(".msgs"); if (b) b.scrollTop = b.scrollHeight; };

// ---- Komposer: emoji, lampiran, balasan ----
actions.emotoggle = () => $("#c-emoji")?.classList.toggle("hidden");
actions.emo = el => { const t = $(".cform textarea"); if (!t) return; const p = t.selectionStart ?? t.value.length; t.value = t.value.slice(0, p) + el.dataset.e + t.value.slice(t.selectionEnd ?? p); t.focus(); t.selectionStart = t.selectionEnd = p + el.dataset.e.length; };
actions.attmenu = () => openOverlay(`<div class="sheet-head"><h3>Kirim lampiran</h3><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div>
  <div class="att-grid"><button data-act="attopen" data-id="c-gal"><i class="g1">${svg("image", 24)}</i>Galeri foto</button><button data-act="attcam"><i class="g2">${svg("camera", 24)}</i>Kamera</button><button data-act="attopen" data-id="c-doc"><i class="g3">${svg("file", 24)}</i>Dokumen</button></div>
  <p class="muted xs" style="margin-top:12px">Foto JPG/PNG/WEBP dikompres otomatis. Dokumen (PDF, Word, Excel, dll.) maksimal 600 KB.</p>`);
actions.attopen = el => { closeOverlay(); $("#" + el.dataset.id)?.click(); };
actions.attcam = () => { closeOverlay(); $(".cform input[capture]")?.click(); };
actions.attpick = async inp => {
  const f = inp.files?.[0]; inp.value = ""; if (!f) return;
  try {
    if (/^image\//.test(f.type)) C.att = { image: await compressImage(f, 1280, 330000), name: f.name };
    else { if (f.size > MAX_DOC) throw new Error(`Dokumen terlalu besar (${size(f.size)}). Maksimal 600 KB.`);
      const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("File tidak bisa dibaca.")); r.readAsDataURL(f); });
      C.att = { file: { name: f.name.slice(0, 120), size: f.size, type: f.type || "application/octet-stream", data } }; }
    drawAtt(); $(".cform textarea")?.focus();
  } catch (e) { toast(e.message, "err"); }
};
const drawAtt = () => { const b = $("#c-att"); if (!b) return; b.classList.toggle("hidden", !C.att);
  b.innerHTML = C.att ? `${C.att.image ? `<img src="${esc(C.att.image)}" alt="">` : `<span class="c-att-f">${svg("file", 22)}</span>`}<span class="sp"><b>${C.att.image ? "Foto siap dikirim" : esc(C.att.file.name)}</b><small class="muted">${C.att.image ? "Tambahkan keterangan bila perlu" : size(C.att.file.size)}</small></span><button type="button" class="icon-btn" data-act="attclear" aria-label="Batal">${svg("x", 18)}</button>` : ""; };
actions.attclear = () => { C.att = null; drawAtt(); };
const drawReply = () => { const b = $("#c-reply"); if (!b) return; b.classList.toggle("hidden", !C.reply);
  b.innerHTML = C.reply ? `${svg("reply", 18)}<span class="sp">${replyBox(C.reply)}</span><button type="button" class="icon-btn" data-act="replyclear" aria-label="Batal balas">${svg("x", 18)}</button>` : ""; };
actions.replyclear = () => { C.reply = null; drawReply(); };
export const resetCompose = () => { C.reply = null; C.att = null; };

export async function sendMsg(uid, from, msg) {
  const { addDoc, setDoc, doc, collection, serverTimestamp, increment } = F;
  try {
    await addDoc(collection(db, "chats", uid, "messages"), { from, senderId: S.user.uid, createdAt: serverTimestamp(), text: msg.text || "", ...(msg.image ? { image: msg.image } : {}), ...(msg.file ? { file: msg.file } : {}), ...(msg.replyTo ? { replyTo: msg.replyTo } : {}) });
    const meta = from === "admin"
      ? { lastFrom: "admin", unreadUser: increment(1) }
      : { uid, name: S.profile.displayName || "Pelanggan", email: S.user.email || "", photoURL: S.profile.photoURL || "", phone: S.profile.phone || "", lastFrom: "user", unreadAdmin: increment(1) };
    await setDoc(doc(db, "chats", uid), { ...meta, lastMessage: (msg.image ? "[Foto] " : msg.file ? "[Dokumen] " : "") + (msg.text || (msg.file?.name || "")).slice(0, 110), updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    if (e.code === "permission-denied") throw new Error("Ditolak Firestore. Publish firestore.rules terbaru di Firebase Console (lihat README).");
    throw e;
  }
}
export async function markRead(uid, who) {
  try { await F.setDoc(F.doc(db, "chats", uid), who === "admin" ? { unreadAdmin: 0 } : { unreadUser: 0 }, { merge: true }); } catch {}
}
forms.chat = async (f, fd) => {
  const text = String(fd.get("text") || "").trim(); if (!text && !C.att) return;
  const uid = threadUid(); if (!uid) return;
  const msg = { text, ...(C.att || {}), ...(C.reply ? { replyTo: C.reply } : {}) };
  f.reset(); f.querySelector("textarea").style.height = "auto"; $("#c-emoji")?.classList.add("hidden");
  C.att = null; C.reply = null; drawAtt(); drawReply();
  await sendMsg(uid, S.isAdmin ? "admin" : "user", msg);
};

// ---- Menu pesan: reaksi, balas, hapus ----
actions.msgmenu = (el, e) => {
  if (e?.target?.closest?.(".m-file")) return;   // ketuk dokumen = unduh, bukan buka menu
  const m = S.msgs.find(x => x.id === el.dataset.id); if (!m) return;
  const mine = m.senderId === myUid(), canAll = mine || S.isAdmin, my = m.reactions?.[myUid()];
  openOverlay(`<div class="m-sheet"><div class="m-reacts">${REACT.map(e => `<button class="${my === e ? "on" : ""}" data-act="react" data-id="${m.id}" data-e="${e}">${e}</button>`).join("")}</div>
    <div class="m-prev">${m.image ? `<img src="${esc(m.image)}" alt="">` : ""}<span>${esc(preview(m)).slice(0, 160)}</span></div>
    <div class="m-acts"><button data-act="msgreply" data-id="${m.id}">${svg("reply", 20)} Balas</button>
    ${m.image ? `<button data-act="msgimg" data-id="${m.id}">${svg("eye", 20)} Lihat foto</button>` : ""}
    <button data-act="msgdel" data-id="${m.id}" data-m="me">${svg("trash", 20)} Hapus untuk saya</button>
    ${canAll ? `<button class="bad" data-act="msgdel" data-id="${m.id}" data-m="all">${svg("trash", 20)} Hapus untuk semua orang</button>` : ""}</div></div>`);
};
actions.react = async el => {
  const uid = threadUid(), ref = F.doc(db, "chats", uid, "messages", el.dataset.id), m = S.msgs.find(x => x.id === el.dataset.id); closeOverlay();
  const same = m?.reactions?.[myUid()] === el.dataset.e;
  await F.updateDoc(ref, { [`reactions.${myUid()}`]: same ? F.deleteField() : el.dataset.e });
};
actions.msgreply = el => {
  const m = S.msgs.find(x => x.id === el.dataset.id); closeOverlay(); if (!m) return;
  C.reply = { id: m.id, from: m.from, text: preview(m).slice(0, 140) }; drawReply(); $(".cform textarea")?.focus();
};
actions.msgimg = el => { const m = S.msgs.find(x => x.id === el.dataset.id); if (!m?.image) return;
  openOverlay(`<div class="sheet-head"><h3>Foto</h3><div class="row"><a class="icon-btn" href="${esc(m.image)}" download="foto-tubi.jpg" aria-label="Unduh">${svg("download", 18)}</a><button class="icon-btn" data-act="close" aria-label="Tutup">${svg("x")}</button></div></div><img src="${esc(m.image)}" alt="" style="width:100%;border-radius:12px">`, "wide"); };
actions.msgdel = async el => {
  const uid = threadUid(), ref = F.doc(db, "chats", uid, "messages", el.dataset.id); closeOverlay();
  if (el.dataset.m === "all") {
    if (!await confirmBox("Hapus untuk semua orang?", "Pesan ini akan hilang permanen bagi kamu dan lawan bicara.", "Hapus")) return;
    await F.deleteDoc(ref);
  } else await F.updateDoc(ref, { hiddenFor: F.arrayUnion(myUid()) });
  toast("Pesan dihapus.");
};
