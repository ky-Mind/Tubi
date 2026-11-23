import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import * as FS from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBX6gj6mboRztlrF9ILRXD1gnHHIB94Bqo",
  authDomain: "tubi-app.firebaseapp.com",
  projectId: "tubi-app",
  messagingSenderId: "492656969625",
  appId: "1:492656969625:web:3bdcd40350d28241b53508"
};
export const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app);
export const db = FS.getFirestore(app);
// Setiap tulisan ke pesanan / chat yang berhasil langsung "mencolek" server notifikasi Tubi, supaya push HP & WhatsApp
// terkirim seketika (tanpa menunggu pemeriksaan berkala 30 detik). Colekan hanya memicu pemeriksaan, aman bila gagal.
const GATEWAY = "https://tubi-gateway.hilmykia.workers.dev";
let colekT = 0;
export const colekServer = () => { clearTimeout(colekT); colekT = setTimeout(() => { try { fetch(GATEWAY + "/segera", { method: "POST", mode: "no-cors", keepalive: true }).catch(() => {}); } catch {} }, 600); };
const perluColek = ref => /^(orders|chats)(\/|$)/.test(ref?.path || "");
const F = { ...FS };
for (const k of ["addDoc", "setDoc", "updateDoc"]) F[k] = async (ref, ...a) => { const r = await FS[k](ref, ...a); if (perluColek(ref)) colekServer(); return r; };
export { A, F };
// Email admin tetap (juga ada di firestore.rules). Admin tambahan disimpan di koleksi `admins`.
export const FIXED_ADMINS = ["hilmykia@gmail.com"];
