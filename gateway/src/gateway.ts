// @ts-nocheck
/* Durable Object "Gateway": satu nomor WhatsApp (Baileys) untuk Tubi.
   - Sesi WhatsApp disimpan di penyimpanan objek ini (lihat sesi-wa.ts).
   - Alarm berdetak tiap DETAK_MS: menjaga koneksi tetap hidup, membaca perintah dari dashboard,
     lalu (bila terhubung) mencari pesanan & chat baru di Firestore dan mengirim WhatsApp-nya.
   - Status (QR, kode pairing, terhubung/tidak) ditulis ke Firestore waGateway/status, yang dibaca Dashboard Admin. */
import { DurableObject } from "cloudflare:workers";
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { Firestore } from "./firestore.ts";
import { sesiWA, hapusSesiWA } from "./sesi-wa.ts";
import { pesanOrderBaru, pesanUntukPelanggan, pesanStatus, pesanChat, PESAN_TES, normPhone, digits } from "./pesan.ts";

const DETAK_MS = 30_000;              // jarak antar-detak saat aktif
const DETAK_DIAM_MS = 60_000;         // saat bot diam (belum dipakai / QR kedaluwarsa)
const SINYAL_MS = 90_000;             // dashboard menganggap gateway mati bila sinyal > 4 menit
const SEGAR_PENGATURAN_MS = 5 * 60_000;
const JEDA_KIRIM_MS = 2_500;          // jeda antar-pesan (anti-spam)
const ORDER_SEGAR_MS = 60 * 60_000;   // pesanan lebih tua dari ini tidak dikabarkan lagi
const CHAT_SEGAR_MS = 10 * 60_000;
const TUMPANG_MS = 30_000;            // kueri mundur sedikit supaya dokumen yang telat tercatat tidak terlewat

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

// Logger ringan untuk Baileys (pino tidak diperlukan di Workers). Hanya galat yang dicetak.
const logBaileys = {
  level: "error",
  child() { return logBaileys; },
  trace() {}, debug() {}, info() {}, warn() {},
  error(o, m) { console.error("[baileys]", m || "", o?.err?.message || o?.message || ""); },
  fatal(o, m) { console.error("[baileys:fatal]", m || "", o?.err?.message || o?.message || ""); },
};

export class Gateway extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sock = null;
    this.mulai = false;
    this.antreKirim = Promise.resolve();
    this.st = { state: "starting", connected: false, qr: null, pairingCode: null, me: null, error: null };
    this.pengaturan = {};
    this.adminDocs = [];
    this.terakhirPengaturan = 0;
    this.terakhirSinyal = 0;
    this.sedangDetak = false;
    this.nomorPairing = null;
    this.ulang = 0;                   // hitungan sambung ulang beruntun (untuk jeda bertahap)
    ctx.blockConcurrencyWhile(async () => {
      if (!(await ctx.storage.getAlarm())) await ctx.storage.setAlarm(Date.now() + 1_000);
    });
  }

  get db() {
    if (!this._db) {
      if (!this.env.FIREBASE_SA || this.env.FIREBASE_SA === "{}") return null;
      this._db = new Firestore(this.env.FIREBASE_SA);
    }
    return this._db;
  }

  // ---------- Pintu masuk ----------
  async fetch(req) {
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 1_000);
    if (this.st.state === "starting" && !this.sock && (await this.ctx.storage.get("diam"))) this.st.state = "idle";
    const jalur = new URL(req.url).pathname;
    // /qr.json hanya dipakai halaman QR lokal (index.ts menolaknya di production). Membuka halaman itu = minta QR baru.
    if (jalur === "/qr.json") {
      if (!this.st.connected && !this.sock && !this.mulai) this.ctx.waitUntil(this.restartWA());
      const { state, qr, pairingCode, me, error } = this.st;
      return Response.json({ state, qr, pairingCode, me, error });
    }
    const { state, connected, me, error } = this.st;
    return Response.json({ app: "tubi", ok: true, state, connected, me, error, firebase: !!this.db });
  }

  async alarm() {
    const diam = await this.ctx.storage.get("diam");
    try { await this.detak(); }
    catch (e) { console.error("detak gagal:", e?.message || e); }
    finally { await this.ctx.storage.setAlarm(Date.now() + (diam && !this.sock ? DETAK_DIAM_MS : DETAK_MS)); }
  }

  async detak() {
    if (this.sedangDetak) return;
    this.sedangDetak = true;
    try {
      if (!this.db) return this.status({ state: "error", error: "FIREBASE_SA belum diisi di gateway." }, false);
      await this.periksaPerintah();
      if (!this.sock && !this.mulai && !(await this.ctx.storage.get("diam"))) await this.mulaiWA();
      if (Date.now() - this.terakhirPengaturan > SEGAR_PENGATURAN_MS) await this.muatPengaturan();
      if (this.st.connected) await this.periksaFirestore();
      if (Date.now() - this.terakhirSinyal > SINYAL_MS) await this.status({ gateway: "online", heartbeat: Date.now() });
    } finally { this.sedangDetak = false; }
  }

  // ---------- Status ke dashboard ----------
  async status(patch, ubahLokal = true) {
    if (ubahLokal) Object.assign(this.st, patch);
    this.terakhirSinyal = Date.now();
    if (!this.db) return;
    const { state, qr, pairingCode, me, error } = this.st;
    try { await this.db.gabung("waGateway/status", { state, qr, pairingCode, me, error, ...patch }, ["updatedAt"]); }
    catch (e) { console.error("tulis status gagal:", e.message); }
  }

  // ---------- WhatsApp ----------
  async mulaiWA() {
    if (this.mulai) return;
    this.mulai = true;
    try {
      const { state: auth, saveCreds } = await sesiWA(this.ctx.storage);
      if (!this.versi) this.versi = (await fetchLatestBaileysVersion().catch(() => ({}))).version;
      const sock = makeWASocket({
        version: this.versi, auth, logger: logBaileys,
        browser: Browsers.macOS(this.env.WA_DEVICE_NAME || "Tubi Gateway"),
        markOnlineOnConnect: false, syncFullHistory: false, shouldSyncHistoryMessage: () => false,
      });
      this.sock = sock;
      if (!this.st.qr) await this.status({ state: "connecting", connected: false });
      sock.ev.on("creds.update", () => saveCreds().catch((e) => console.error("simpan sesi:", e.message)));
      sock.ev.on("connection.update", (u) => this.ctx.waitUntil(this.saatUpdate(sock, u)));
    } catch (e) {
      console.error("mulai WA gagal:", e?.message || e);
      this.sock = null;
      await this.status({ state: "error", connected: false, error: "Gagal memulai WhatsApp: " + (e?.message || e) });
    } finally { this.mulai = false; }
  }

  async saatUpdate(sock, { connection, lastDisconnect, qr }) {
    if (sock !== this.sock) return;   // abaikan soket lama
    if (qr) {
      if (this.nomorPairing && !sock.authState.creds.registered) {
        const nomor = this.nomorPairing; this.nomorPairing = null;
        try { await this.status({ state: "pairing", pairingCode: await sock.requestPairingCode(nomor), qr: null, error: null }); }
        catch (e) { await this.status({ state: "error", error: "Gagal membuat kode pairing: " + (e?.message || e) }); }
      } else if (this.st.state !== "pairing") {
        const svg = await QRCode.toString(qr, { type: "svg", margin: 1, width: 280 });
        await this.status({ state: "qr", qr: "data:image/svg+xml;base64," + btoa(svg), pairingCode: null, error: null });
      }
    }
    if (connection === "open") {
      this.ulang = 0;
      await this.status({ state: "connected", connected: true, qr: null, pairingCode: null, error: null, me: digits(sock.user?.id?.split(":")[0]) });
      console.log("WhatsApp terhubung sebagai", this.st.me);
      await this.muatPengaturan();
      await this.periksaFirestore();
    }
    if (connection === "close") {
      this.sock = null;
      const kode = lastDisconnect?.error?.output?.statusCode;
      const terdaftar = sock.authState.creds.registered;
      console.log("WhatsApp terputus, kode", kode, lastDisconnect?.error?.message || "");
      this.st.connected = false;
      if (kode === DisconnectReason.loggedOut) {
        await hapusSesiWA(this.ctx.storage);
        await this.status({ state: "logged_out", connected: false, qr: null, pairingCode: null, me: null, error: null });
        setTimeout(() => this.mulaiWA(), 1_500);          // siapkan QR baru
      } else if (kode === DisconnectReason.restartRequired) {
        this.mulaiWA();                                    // terjadi tepat setelah QR dipindai
      } else if (!terdaftar && kode === DisconnectReason.timedOut) {
        await this.diam("QR kedaluwarsa karena tidak dipindai. Tekan Restart untuk QR baru.");
      } else if (kode === DisconnectReason.connectionReplaced) {
        await this.diam("Sesi WhatsApp dipakai di gateway lain. Tekan Restart untuk mengambil alih.");
      } else {
        this.ulang++;
        await this.status({ state: "connecting", connected: false });
        setTimeout(() => this.mulaiWA(), Math.min(3_000 * this.ulang, 60_000));
      }
    }
  }

  async diam(alasan) {
    this.putus();
    await this.ctx.storage.put("diam", true);
    await this.status({ state: "idle", connected: false, qr: null, pairingCode: null, error: alasan });
  }

  putus() {
    const s = this.sock;
    this.sock = null;
    this.st.connected = false;
    try { s?.end(undefined); } catch {}
  }

  async restartWA() {
    this.putus();
    await this.ctx.storage.delete("diam");
    await tidur(500);
    await this.mulaiWA();
  }

  async pairWA(nomor) {
    this.putus();
    await hapusSesiWA(this.ctx.storage);
    await this.ctx.storage.delete("diam");
    this.nomorPairing = normPhone(nomor);
    await this.status({ state: "connecting", qr: null, pairingCode: null, me: null, error: null });
    await this.mulaiWA();
  }

  async logoutWA() {
    try { await this.sock?.logout(); }                     // memicu loggedOut -> sesi dihapus -> QR baru
    catch {
      this.putus();
      await hapusSesiWA(this.ctx.storage);
      await this.status({ state: "logged_out", qr: null, me: null });
      setTimeout(() => this.mulaiWA(), 800);
    }
  }

  /** Kirim teks lewat antrean (satu per satu, dengan jeda). true bila terkirim. */
  kirim(nomor, teks) {
    const n = normPhone(nomor);
    if (n.length < 10) return Promise.resolve(false);
    const p = this.antreKirim.then(async () => {
      if (!this.st.connected || !this.sock) throw new Error("WhatsApp belum terhubung");
      await this.sock.sendMessage(`${n}@s.whatsapp.net`, { text: teks });
      await tidur(JEDA_KIRIM_MS);
    });
    this.antreKirim = p.catch(() => {});
    return p.then(() => true, (e) => { console.warn("gagal kirim ke", n, e.message); return false; });
  }

  // ---------- Data toko ----------
  nomorAdmin() {
    return [...new Set([normPhone(this.pengaturan.whatsapp), ...this.adminDocs.map((a) => normPhone(a.phone))].filter((n) => n.length >= 10))];
  }
  async keAdmin(teks) {
    const hasil = [];
    for (const n of this.nomorAdmin()) hasil.push(await this.kirim(n, teks));
    return hasil.length > 0 && hasil.every(Boolean);
  }

  async muatPengaturan() {
    try {
      this.pengaturan = (await this.db.ambil("settings/store")) || {};
      this.adminDocs = await this.db.daftar("admins");
      this.terakhirPengaturan = Date.now();
    } catch (e) { console.error("muat pengaturan:", e.message); }
  }

  // ---------- Perintah dari Dashboard Admin (pair / restart / logout / test) ----------
  async periksaPerintah() {
    const c = await this.db.ambil("waGateway/command");
    if (!c?.id) return;
    const terakhir = await this.ctx.storage.get("perintah");
    if (terakhir !== undefined && c.id <= terakhir) return;
    await this.ctx.storage.put("perintah", c.id);
    // Saat gateway baru pertama jalan, perintah lama (lebih dari 2 menit) tidak dijalankan ulang.
    if (terakhir === undefined && Date.now() - (c.createdAt || c.id) > 2 * 60_000) return;
    console.log("perintah dari admin:", c.action);
    if (c.action === "test") {
      await this.muatPengaturan();
      await this.status({ lastTest: (await this.keAdmin(PESAN_TES)) ? "ok" : "gagal" });
    }
    if (c.action === "restart") await this.restartWA();
    if (c.action === "logout") await this.logoutWA();
    if (c.action === "pair" && c.phone) await this.pairWA(c.phone);
  }

  // ---------- Pesanan & chat ----------
  async kursor(nama, awal) {
    return (await this.ctx.storage.get("kursor:" + nama)) ?? Date.now() - awal;
  }

  async periksaFirestore() {
    try {
      // Pesanan baru (createdAt) dan perubahan status (updatedAt), digabung per id supaya tidak diproses dua kali.
      const kBaru = await this.kursor("orderBaru", ORDER_SEGAR_MS), kUbah = await this.kursor("orderUbah", ORDER_SEGAR_MS);
      const baru = await this.db.sejak("orders", "createdAt", kBaru - TUMPANG_MS);
      const ubah = await this.db.sejak("orders", "updatedAt", kUbah - TUMPANG_MS);
      const pesanan = new Map([...baru, ...ubah].map((d) => [d.id, d]));
      for (const d of pesanan.values()) await this.prosesOrder(d);
      if (baru.length) await this.ctx.storage.put("kursor:orderBaru", Math.max(kBaru, ...baru.map((d) => d.createdAt || 0)));
      if (ubah.length) await this.ctx.storage.put("kursor:orderUbah", Math.max(kUbah, ...ubah.map((d) => d.updatedAt || 0)));

      const kChat = await this.kursor("chat", CHAT_SEGAR_MS);
      const chats = await this.db.sejak("chats", "updatedAt", kChat - TUMPANG_MS);
      for (const d of chats) await this.prosesChat(d);
      if (chats.length) await this.ctx.storage.put("kursor:chat", Math.max(kChat, ...chats.map((d) => d.updatedAt || 0)));
    } catch (e) { console.error("periksa Firestore:", e.message); }
  }

  async prosesOrder(d) {
    if (!this.st.connected) return;
    const p = this.pengaturan, patch = {};
    if (!d.waNewSent) {
      if (Date.now() - (d.createdAt || 0) < ORDER_SEGAR_MS) {
        if (p.waNotifyAdmin !== false && this.nomorAdmin().length) await this.keAdmin(pesanOrderBaru(d));
        if (p.waNotifyCustomer !== false && d.phone) await this.kirim(d.phone, pesanUntukPelanggan(d));
      }
      Object.assign(patch, { waNewSent: true, waStatusSent: d.status || "menunggu" });
    } else if (d.status && d.status !== d.waStatusSent) {
      const teks = pesanStatus(d);
      if (teks && p.waNotifyCustomer !== false && d.phone) await this.kirim(d.phone, teks);
      patch.waStatusSent = d.status;
    }
    if (Object.keys(patch).length) await this.db.gabung(`orders/${d.id}`, patch);
  }

  async prosesChat(d) {
    if (!this.st.connected || this.pengaturan.waNotifyAdmin === false || !this.nomorAdmin().length) return;
    const t = d.updatedAt || 0;
    if (d.lastFrom !== "user" || t <= (d.waChatAt || 0)) return;
    await this.db.gabung(`chats/${d.id}`, { waChatAt: t });
    if (Date.now() - t <= CHAT_SEGAR_MS) await this.keAdmin(pesanChat(d));
  }
}
